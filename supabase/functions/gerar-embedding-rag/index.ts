import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { gerarEmbedding } from '../_shared/rag.ts';

const MAX_TEXT_CHARS = 3_000;

Deno.serve(async req => {
  if (req.method !== 'POST') {
    return Response.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');
  if (!serviceRoleKey || authorization !== `Bearer ${serviceRoleKey}`) {
    return Response.json({ code: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const body = await req.json() as { texto?: unknown };
    const texto = typeof body.texto === 'string' ? body.texto.trim() : '';
    if (!texto || texto.length > MAX_TEXT_CHARS) {
      return Response.json({ code: 'EMBEDDING_INPUT_INVALID' }, { status: 400 });
    }

    const embedding = await gerarEmbedding(texto);
    return Response.json({ embedding }, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.json({ code: 'EMBEDDING_GENERATION_FAILED' }, { status: 500 });
  }
});
