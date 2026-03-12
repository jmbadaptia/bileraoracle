-- Conversations & chat messages for AI assistant
-- Run as bilera user on FREEPDB1

CREATE TABLE conversations (
  id            VARCHAR2(36)  DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id     NUMBER        NOT NULL REFERENCES tenants(id),
  user_id       VARCHAR2(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR2(200) DEFAULT 'Nueva conversación',
  created_at    TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at    TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);

CREATE TABLE chat_messages (
  id              VARCHAR2(36)  DEFAULT SYS_GUID() PRIMARY KEY,
  conversation_id VARCHAR2(36)  NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR2(20)  NOT NULL CHECK (role IN ('user', 'assistant')),
  content         CLOB          NOT NULL,
  sources         CLOB,
  created_at      TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_chat_messages_conv ON chat_messages(conversation_id, created_at);
