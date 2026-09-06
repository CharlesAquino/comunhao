DROP TABLE IF EXISTS intercessoes;
DROP TABLE IF EXISTS historico_oracoes;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS usuarios;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  telefone TEXT UNIQUE NOT NULL,
  foto_url TEXT,
  status_anel TEXT CHECK (status_anel IN ('offline', 'disponivel', 'orando')) DEFAULT 'offline',
  pontos_comunhao INT DEFAULT 0,
  streak_dias INT DEFAULT 0,
  orando_por_id UUID REFERENCES usuarios(id),
  sendo_orado_por_id UUID REFERENCES usuarios(id),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  autor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('em_clamor', 'testemunho')) DEFAULT 'em_clamor',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finalizado_em TIMESTAMP WITH TIME ZONE
);

CREATE TABLE intercessoes (
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pedido_id, usuario_id)
);

CREATE TABLE historico_oracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_1_id UUID REFERENCES usuarios(id),
  usuario_2_id UUID REFERENCES usuarios(id),
  duracao_segundos INT NOT NULL,
  pontos_gerados INT NOT NULL,
  finalizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_oracoes ENABLE ROW LEVEL SECURITY;

-- Políticas para 'usuarios'
CREATE POLICY "Leitura pública de usuários" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Cadastro público de usuários" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizações de perfil e anel" ON usuarios FOR UPDATE USING (true);

-- Políticas para 'pedidos'
CREATE POLICY "Leitura pública de pedidos" ON pedidos FOR SELECT USING (true);
CREATE POLICY "Criação pública de pedidos" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizações de pedidos" ON pedidos FOR UPDATE USING (true);
CREATE POLICY "Remoção pública de pedidos" ON pedidos FOR DELETE USING (true);

-- Políticas para 'intercessoes'
CREATE POLICY "Leitura pública de intercessões" ON intercessoes FOR SELECT USING (true);
CREATE POLICY "Inserção pública de intercessões" ON intercessoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Remoção pública de intercessões" ON intercessoes FOR DELETE USING (true);

-- Políticas para 'historico_oracoes'
CREATE POLICY "Leitura de histórico de orações" ON historico_oracoes FOR SELECT USING (true);
CREATE POLICY "Inserção de sessões de oração" ON historico_oracoes FOR INSERT WITH CHECK (true);
