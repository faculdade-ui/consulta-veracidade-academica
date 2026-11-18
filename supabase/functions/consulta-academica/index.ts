import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function onlyDigits(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

function validCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

function formatDate(value: string | null): string {
  if (!value) return 'Não informado';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);

  // Limite básico de tamanho; considere adicionar rate limiting/WAF antes de produção.
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > 5000) return jsonResponse({ error: 'Requisição inválida.' }, 413);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Envie os dados em formato JSON.' }, 400); }

  const cpf = onlyDigits(body.cpf);
  const matricula = typeof body.matricula === 'string' ? body.matricula.trim() : '';
  const codigo = typeof body.codigo === 'string' ? body.codigo.trim() : '';

  if (!validCpf(cpf) || !matricula || !codigo || matricula.length > 80 || codigo.length > 120) {
    return jsonResponse({ error: 'Informe CPF válido, matrícula e código de veracidade.' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // Configure SUPABASE_SERVICE_ROLE_KEY nos secrets da Edge Function. Nunca no HTML.
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('Configuração do Supabase ausente.');
    return jsonResponse({ error: 'Serviço temporariamente indisponível.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'Cache-Control': 'no-store' } },
  });

  const { data, error } = await admin
    .from('registros_academicos')
    .select('nome_aluno, matricula, curso, tipo_documento, codigo_veracidade, data_emissao, status, observacao_publica')
    .eq('cpf', cpf)
    .eq('matricula', matricula)
    .eq('codigo_veracidade', codigo)
    .maybeSingle();

  if (error) {
    console.error('Falha na consulta acadêmica:', error.message);
    return jsonResponse({ error: 'Não foi possível concluir a consulta agora.' }, 500);
  }

  // Resposta genérica para não revelar se CPF, matrícula ou código isoladamente existem.
  if (!data) return jsonResponse({ found: false, code: 'NOT_FOUND' }, 404);

  const labels: Record<string, string> = {
    valido: 'Válido',
    cancelado: 'Cancelado',
    suspenso: 'Suspenso',
    em_analise: 'Em análise',
    invalido: 'Inválido',
  };

  return jsonResponse({
    found: true,
    record: {
      nome_aluno: data.nome_aluno,
      matricula: data.matricula,
      curso: data.curso || 'Não informado',
      tipo_documento: data.tipo_documento,
      codigo_veracidade: data.codigo_veracidade,
      data_emissao: formatDate(data.data_emissao),
      status: data.status,
      status_label: labels[data.status] || 'Situação não reconhecida',
      observacao_publica: data.observacao_publica || 'Sem observações públicas.',
    },
  });
});
