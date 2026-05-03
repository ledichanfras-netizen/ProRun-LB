
-- Esquema para Gerenciamento de Assinaturas ProRun LB

-- 1. Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id TEXT, -- ID do atleta no sistema (se diferente do user_id)
    plan_type TEXT CHECK (plan_type IN ('mensal', 'trimestral', 'semestral', 'anual')),
    status TEXT CHECK (status IN ('active', 'expired', 'trial')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
-- Usuários podem ver suas próprias assinaturas
CREATE POLICY "Users can view own subscription" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Apenas admins (coaches) podem gerenciar assinaturas
-- Substituir 'leandro@exemplo.com' pelo seu e-mail de admin se necessário
CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscriptions FOR ALL 
USING (auth.jwt() ->> 'email' = 'leandro@exemplo.com');

-- 4. Função para atualizar o status automaticamente (Opcional - Requer pg_cron ou Edge Functions)
-- Por enquanto, o status é gerenciado via integração de pagamento (Stripe/Webhooks)

COMMENT ON TABLE public.subscriptions IS 'Armazena o status dos planos de performance dos atletas.';
