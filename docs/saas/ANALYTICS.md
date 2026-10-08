# Analytics por tenant

Eventos públicos: `site_view`, `property_view`, `whatsapp_click`, `interest_submit`, `favorite_add`, `search`.

Cada evento carrega `tenant_id`; `property_id` é opcional e validado no mesmo tenant. O identificador de visitante é first-party e com hash; IP puro não é persistido. UTM serve apenas a analytics e nunca preenche a origem comercial do CRM.

Painel e Super Admin não registram eventos públicos. Escrita é tolerante a falhas, limitada e deduplicada. Eventos detalhados têm retenção configurável e agregações diárias preservam histórico antes da limpeza.
