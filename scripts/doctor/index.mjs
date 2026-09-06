import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const FULL = ARGS.has("--full");
const LIVE = ARGS.has("--live");
const JSON_MODE = ARGS.has("--json");

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".gradle",
  ".idea",
  ".vscode",
  "coverage",
]);

const ACTIVITY_TYPES = [
  "mao_levantada",
  "convite_oracao",
  "convite_aceito",
  "intercessao_pedido",
  "nova_publicacao_mural",
  "comentario_publicacao",
  "curtida_publicacao",
  "nova_licao",
  "nova_mensagem",
];

const report = {
  startedAt: new Date().toISOString(),
  projectRoot: ROOT,
  mode: { full: FULL, live: LIVE },
  checks: [],
  summary: { pass: 0, warn: 0, fail: 0 },
};

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function paint(color, text) {
  if (JSON_MODE) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

function add(status, area, message, details = undefined) {
  report.checks.push({ status, area, message, details });
  report.summary[status]++;

  if (JSON_MODE) return;

  const icon = status === "pass" ? "✅" : status === "warn" ? "⚠️ " : "❌";
  const color = status === "pass" ? "green" : status === "warn" ? "yellow" : "red";
  console.log(`${paint(color, icon)} ${paint("bold", area)} — ${message}`);

  if (details) {
    const lines = Array.isArray(details) ? details : [details];
    for (const line of lines) {
      console.log(`   ${paint("gray", String(line))}`);
    }
  }
}

function section(name) {
  if (!JSON_MODE) {
    console.log(`\n${paint("cyan", "─".repeat(64))}`);
    console.log(paint("bold", name));
    console.log(paint("cyan", "─".repeat(64)));
  }
}

function loadEnvFile(filename) {
  const file = path.join(ROOT, filename);
  if (!fs.existsSync(file)) return;

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index < 1) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) process.env[key] = value;
  }
}

for (const envFile of [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
]) {
  loadEnvFile(envFile);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }

    if (/\.(ts|tsx|js|jsx|mjs|cjs|sql|json)$/.test(entry.name)) {
      files.push(full);
    }
  }

  return files;
}

function rel(file) {
  return path.relative(ROOT, file);
}

function readSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

const sourceFiles = [
  ...walk(path.join(ROOT, "src")),
  ...walk(path.join(ROOT, "supabase")),
];

const corpus = sourceFiles.map((file) => ({
  file,
  relative: rel(file),
  text: readSafe(file),
}));

function filesContaining(pattern) {
  return corpus.filter(({ text }) =>
    typeof pattern === "string" ? text.includes(pattern) : pattern.test(text),
  );
}

function probableNotificationProducers(type) {
  return corpus.filter(({ text }) => {
    if (!text.includes(type)) return false;
    const table = text.includes("app_notificacoes");
    const insert =
      /\.insert\s*\(/.test(text) ||
      /insert\s+into\s+(public\.)?app_notificacoes/i.test(text) ||
      /criarNotificacao|enviarNotificacao|registrarNotificacao/i.test(text);
    return table && insert;
  });
}

function probableNotificationConsumers() {
  return corpus.filter(({ text }) =>
    text.includes("app_notificacoes") &&
    (
      /\.select\s*\(/.test(text) ||
      /postgres_changes/.test(text) ||
      /\.channel\s*\(/.test(text) ||
      /subscribeToAppNotifications/.test(text)
    )
  );
}

function checkProject() {
  section("1. Estrutura do projeto");

  const packagePath = path.join(ROOT, "package.json");
  if (!fs.existsSync(packagePath)) {
    add("fail", "Projeto", "package.json não encontrado.");
    return;
  }

  add("pass", "Projeto", "package.json encontrado.");

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch (error) {
    add("fail", "Projeto", "package.json inválido.", String(error));
    return;
  }

  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  for (const dep of ["react", "vite", "typescript", "@supabase/supabase-js"]) {
    if (allDeps[dep]) add("pass", "Dependência", `${dep} instalado (${allDeps[dep]}).`);
    else add("warn", "Dependência", `${dep} não foi encontrado no package.json.`);
  }

  const src = path.join(ROOT, "src");
  if (fs.existsSync(src)) add("pass", "Estrutura", "Pasta src encontrada.");
  else add("fail", "Estrutura", "Pasta src não encontrada.");

  const tsconfig = ["tsconfig.json", "tsconfig.app.json"]
    .map((name) => path.join(ROOT, name))
    .find(fs.existsSync);

  if (tsconfig) add("pass", "TypeScript", `Configuração encontrada: ${rel(tsconfig)}.`);
  else add("warn", "TypeScript", "Nenhum tsconfig foi encontrado.");

  const viteConfig = ["vite.config.ts", "vite.config.js", "vite.config.mjs"]
    .map((name) => path.join(ROOT, name))
    .find(fs.existsSync);

  if (viteConfig) add("pass", "Vite", `Configuração encontrada: ${rel(viteConfig)}.`);
  else add("warn", "Vite", "Arquivo de configuração do Vite não encontrado.");
}

function checkNotificationCenter() {
  section("2. Central de Atividades");

  const center = corpus.find(({ relative }) =>
    relative.endsWith("src/components/NotificationCenterButton.tsx")
  );

  if (!center) {
    add("fail", "Central", "NotificationCenterButton.tsx não foi encontrado.");
  } else {
    add("pass", "Central", "NotificationCenterButton.tsx encontrado.", center.relative);

    for (const token of [
      "listarNotificacoes",
      "contarNotificacoesNaoLidas",
      "marcarNotificacaoComoLida",
      "marcarTodasNotificacoesComoLidas",
      "subscribeToAppNotifications",
    ]) {
      if (center.text.includes(token)) {
        add("pass", "Central", `${token} está conectado ao componente.`);
      } else {
        add("fail", "Central", `${token} não aparece no componente.`);
      }
    }

    if (center.text.includes("NotificationActivityCard")) {
      add("pass", "Central", "NotificationActivityCard está sendo renderizado.");
    } else {
      add("warn", "Central", "NotificationActivityCard não aparece no componente.");
    }

    for (const filter of ["Todas", "Orações", "Mural", "EBD"]) {
      if (center.text.includes(filter)) add("pass", "Filtro", `${filter} encontrado.`);
      else add("warn", "Filtro", `${filter} não encontrado.`);
    }
  }

  const service = corpus.find(({ relative }) =>
    relative.endsWith("src/services/notificationService.ts")
  );

  if (!service) {
    add("fail", "Serviço", "notificationService.ts não foi encontrado.");
  } else {
    add("pass", "Serviço", "notificationService.ts encontrado.", service.relative);

    const operations = [
      [".select(", "leitura"],
      [".update(", "atualização"],
      [".channel(", "canal realtime"],
      ["postgres_changes", "escuta postgres_changes"],
    ];

    for (const [token, label] of operations) {
      if (service.text.includes(token)) add("pass", "Serviço", `${label} detectada.`);
      else add("warn", "Serviço", `${label} não detectada.`);
    }

    const hasInsert =
      /\.insert\s*\(/.test(service.text) ||
      /insert\s+into\s+(public\.)?app_notificacoes/i.test(service.text);

    if (hasInsert) add("pass", "Serviço", "Existe inserção de notificações no serviço.");
    else add("warn", "Serviço", "O serviço não parece criar notificações.");
  }

  const consumers = probableNotificationConsumers();
  if (consumers.length) {
    add(
      "pass",
      "Consumo",
      `${consumers.length} arquivo(s) consomem app_notificacoes.`,
      consumers.slice(0, 10).map(({ relative }) => relative),
    );
  } else {
    add("fail", "Consumo", "Nenhum consumidor de app_notificacoes foi localizado.");
  }
}

function checkActivityProducers() {
  section("3. Produtores das atividades");

  for (const type of ACTIVITY_TYPES) {
    const refs = filesContaining(type);
    const producers = probableNotificationProducers(type);

    if (producers.length) {
      add(
        "pass",
        type,
        "Produtor provável encontrado.",
        producers.slice(0, 8).map(({ relative }) => relative),
      );
      continue;
    }

    if (refs.length) {
      add(
        "warn",
        type,
        "O tipo existe no projeto, mas nenhuma gravação foi detectada.",
        refs.slice(0, 8).map(({ relative }) => relative),
      );
      continue;
    }

    add("fail", type, "O tipo não aparece em nenhum arquivo analisado.");
  }
}

function checkRouting() {
  section("4. Roteamento");

  const routing = corpus.find(({ relative }) =>
    relative.endsWith("src/services/notificationRouting.ts")
  );

  if (!routing) {
    add("fail", "Rotas", "notificationRouting.ts não foi encontrado.");
    return;
  }

  add("pass", "Rotas", "notificationRouting.ts encontrado.", routing.relative);

  for (const type of ACTIVITY_TYPES.filter((item) => item !== "nova_mensagem")) {
    if (routing.text.includes(type)) {
      add("pass", "Rotas", `${type} possui referência de destino.`);
    } else {
      add("warn", "Rotas", `${type} não aparece no roteamento.`);
    }
  }

  for (const route of ["/mural", "/ebd", "/oracao", "/oração"]) {
    if (routing.text.includes(route)) add("pass", "Rotas", `Destino ${route} encontrado.`);
  }
}

function checkRealtime() {
  section("5. Realtime");

  const realtimeFiles = corpus.filter(({ text }) =>
    text.includes("postgres_changes") ||
    text.includes(".channel(") ||
    text.includes("subscribeToAppNotifications")
  );

  if (!realtimeFiles.length) {
    add("fail", "Realtime", "Nenhuma assinatura realtime foi encontrada.");
    return;
  }

  add(
    "pass",
    "Realtime",
    `${realtimeFiles.length} arquivo(s) possuem assinatura realtime.`,
    realtimeFiles.slice(0, 10).map(({ relative }) => relative),
  );

  const appNotificationRealtime = realtimeFiles.filter(({ text }) =>
    text.includes("app_notificacoes")
  );

  if (appNotificationRealtime.length) {
    add(
      "pass",
      "Realtime",
      "app_notificacoes participa de uma assinatura realtime.",
      appNotificationRealtime.map(({ relative }) => relative),
    );
  } else {
    add("fail", "Realtime", "Nenhuma assinatura realtime aponta para app_notificacoes.");
  }
}

function checkEnvironment() {
  section("6. Ambiente");

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url) add("pass", "Ambiente", "URL do Supabase encontrada.");
  else add("fail", "Ambiente", "VITE_SUPABASE_URL/SUPABASE_URL ausente.");

  if (anon) add("pass", "Ambiente", "Chave anônima do Supabase encontrada.");
  else add("warn", "Ambiente", "Chave anônima do Supabase ausente.");

  if (service) {
    add("pass", "Ambiente", "SUPABASE_SERVICE_ROLE_KEY disponível para testes locais.");
  } else {
    add(
      "warn",
      "Ambiente",
      "SUPABASE_SERVICE_ROLE_KEY ausente; o teste --live não poderá ignorar RLS.",
    );
  }

  const viteServiceRole = Object.keys(process.env).find((key) =>
    key.startsWith("VITE_") && key.includes("SERVICE_ROLE")
  );

  if (viteServiceRole) {
    add(
      "fail",
      "Segurança",
      `${viteServiceRole} expõe uma service role ao frontend. Remova imediatamente.`,
    );
  } else {
    add("pass", "Segurança", "Nenhuma service role com prefixo VITE_ foi detectada.");
  }
}

async function checkLiveDatabase() {
  if (!LIVE) return;

  section("7. Teste ao vivo no Supabase");

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    add("fail", "Banco", "Credenciais insuficientes para o teste ao vivo.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error } = await supabase
    .from("app_notificacoes")
    .select("id", { count: "exact", head: true });

  if (error) {
    add("fail", "Banco", "Falha ao consultar app_notificacoes.", error.message);
    return;
  }

  add("pass", "Banco", `app_notificacoes acessível. Registros visíveis: ${count ?? 0}.`);

  const userId = process.env.TESTE_ATIVIDADES_USUARIO_ID;

  if (!userId) {
    add(
      "warn",
      "Simulação",
      "TESTE_ATIVIDADES_USUARIO_ID não definido; a simulação de inserção foi ignorada.",
    );
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    add(
      "warn",
      "Simulação",
      "Sem service role, a inserção pode ser bloqueada pelas policies RLS.",
    );
  }

  const runId = `doctor-${Date.now()}`;
  const payload = {
    usuario_id: userId,
    tipo: "nova_publicacao_mural",
    titulo: "[DOCTOR] Atividade de teste",
    corpo: "Registro temporário criado pelo Comunhão Doctor.",
    lida: false,
    criada_em: new Date().toISOString(),
    dados: {
      teste_sistemico: true,
      origem: "comunhao-doctor",
      execucao_id: runId,
    },
  };

  const { data: inserted, error: insertError } = await supabase
    .from("app_notificacoes")
    .insert(payload)
    .select("id, tipo, lida")
    .single();

  if (insertError) {
    add("fail", "Simulação", "Falha ao inserir atividade temporária.", insertError.message);
    return;
  }

  add("pass", "Simulação", "Atividade temporária inserida com sucesso.");

  const { data: fetched, error: fetchError } = await supabase
    .from("app_notificacoes")
    .select("id, tipo, lida, dados")
    .eq("id", inserted.id)
    .single();

  if (fetchError || !fetched) {
    add("fail", "Simulação", "A atividade foi inserida, mas não pôde ser relida.", fetchError?.message);
  } else {
    add("pass", "Simulação", "Inserção e leitura confirmadas.");
  }

  const { error: updateError } = await supabase
    .from("app_notificacoes")
    .update({ lida: true })
    .eq("id", inserted.id);

  if (updateError) {
    add("fail", "Simulação", "Falha ao marcar atividade como lida.", updateError.message);
  } else {
    add("pass", "Simulação", "Atualização de leitura confirmada.");
  }

  if (ARGS.has("--keep")) {
    add("warn", "Limpeza", "Registro de teste mantido por causa de --keep.", inserted.id);
  } else {
    const { error: deleteError } = await supabase
      .from("app_notificacoes")
      .delete()
      .eq("id", inserted.id);

    if (deleteError) {
      add("warn", "Limpeza", "Não foi possível remover o registro temporário.", deleteError.message);
    } else {
      add("pass", "Limpeza", "Registro temporário removido.");
    }
  }
}

function checkFullProject() {
  if (!FULL) return;

  section("8. Auditoria ampliada");

  const suspiciousBackups = sourceFiles.filter((file) =>
    /\.(bak|backup|old|save)\./i.test(path.basename(file))
  );

  if (suspiciousBackups.length) {
    add(
      "warn",
      "Arquivos",
      "Arquivos de backup dentro das pastas analisadas.",
      suspiciousBackups.map(rel),
    );
  } else {
    add("pass", "Arquivos", "Nenhum backup suspeito foi localizado.");
  }

  const consoleLogs = corpus.filter(({ text }) => /console\.(log|debug)\s*\(/.test(text));
  if (consoleLogs.length) {
    add(
      "warn",
      "Debug",
      `${consoleLogs.length} arquivo(s) possuem console.log/debug.`,
      consoleLogs.slice(0, 15).map(({ relative }) => relative),
    );
  } else {
    add("pass", "Debug", "Nenhum console.log/debug encontrado.");
  }

  const todos = corpus.filter(({ text }) => /\b(TODO|FIXME|HACK)\b/i.test(text));
  if (todos.length) {
    add(
      "warn",
      "Pendências",
      `${todos.length} arquivo(s) possuem TODO/FIXME/HACK.`,
      todos.slice(0, 15).map(({ relative }) => relative),
    );
  } else {
    add("pass", "Pendências", "Nenhum TODO/FIXME/HACK localizado.");
  }

  const tsIgnore = corpus.filter(({ text }) => /@ts-ignore|@ts-nocheck/.test(text));
  if (tsIgnore.length) {
    add(
      "warn",
      "TypeScript",
      `${tsIgnore.length} arquivo(s) ignoram verificações de tipo.`,
      tsIgnore.slice(0, 15).map(({ relative }) => relative),
    );
  } else {
    add("pass", "TypeScript", "Nenhum @ts-ignore/@ts-nocheck encontrado.");
  }
}

function printConclusion() {
  section("Conclusão");

  const { pass, warn, fail } = report.summary;

  if (!JSON_MODE) {
    console.log(`${paint("green", `✅ ${pass} aprovado(s)`)}  ${paint("yellow", `⚠️ ${warn} alerta(s)`)}  ${paint("red", `❌ ${fail} falha(s)`)}`);
  }

  const missingProducers = report.checks.filter(
    (item) =>
      ACTIVITY_TYPES.includes(item.area) &&
      (item.status === "warn" || item.status === "fail")
  );

  if (!JSON_MODE) {
    console.log("");

    if (missingProducers.length) {
      console.log(paint("red", "Diagnóstico principal:"));
      console.log(
        "A Central pode estar pronta para ler atividades, mas existem tipos sem produtor de banco detectável."
      );
      console.log(
        "Isso significa que as interações reais podem terminar sem inserir linhas em app_notificacoes."
      );
      console.log("");
      console.log("Tipos que precisam de inspeção:");
      for (const item of missingProducers) {
        console.log(`  • ${item.area}: ${item.message}`);
      }
    } else {
      console.log(
        paint("green", "Todos os tipos conhecidos possuem ao menos um produtor provável.")
      );
    }

    console.log("\nComandos:");
    console.log("  npm run doctor");
    console.log("  npm run doctor -- --full");
    console.log("  npm run doctor -- --live");
    console.log("  npm run doctor -- --live --keep");
    console.log("  npm run doctor -- --json > doctor-report.json");
  }

  report.finishedAt = new Date().toISOString();

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exitCode = fail > 0 ? 1 : 0;
}

if (!JSON_MODE) {
  console.log(paint("bold", "\nCOMUNHÃO SYSTEM DOCTOR"));
  console.log(paint("gray", `Projeto: ${ROOT}`));
  console.log(paint("gray", `Modo: ${LIVE ? "ao vivo" : "estático"}${FULL ? " + auditoria ampliada" : ""}`));
}

checkProject();
checkNotificationCenter();
checkActivityProducers();
checkRouting();
checkRealtime();
checkEnvironment();
await checkLiveDatabase();
checkFullProject();
printConclusion();
