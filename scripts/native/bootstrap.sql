INSERT INTO app_config(id,app_name,super_admin_emails,system_settings) VALUES('config','BarbeiroPro AI','[]','{}') ON CONFLICT(id) DO NOTHING;
INSERT INTO plan(id,slug,nome,descricao,preco_cents,limite_profissionais,limite_usuarios,features,ordem) VALUES
 ('starter','starter','Starter','Agenda e cadastro para começar',3900,1,1,'["Agenda online","Cadastro de clientes","Link de agendamento"]',1),
 ('pro','pro','Pro','Gestão completa da barbearia',9900,5,5,'["Profissionais","Comissões","Financeiro","Relatórios","Fidelidade"]',2),
 ('business','business','Business','Gestão para equipes maiores',19900,50,50,'["Tudo do Pro","Clube de assinaturas","API e webhooks"]',3)
ON CONFLICT(id) DO NOTHING;

CREATE TRIGGER IF NOT EXISTS native_company_owner AFTER INSERT ON company WHEN NEW.created_by IS NOT NULL BEGIN
 INSERT INTO company_user(company_id,user_id,email,nome,role,ativo,convite_aceito)
 SELECT NEW.id,p.user_id,p.email,p.nome,'owner',1,1 FROM profiles p WHERE p.user_id=NEW.created_by;
END;

CREATE TRIGGER IF NOT EXISTS native_company_cleanup AFTER DELETE ON company BEGIN
 DELETE FROM company_user WHERE company_id=OLD.id;
 DELETE FROM professional_service WHERE professional_id IN (SELECT id FROM professional WHERE company_id=OLD.id);
 DELETE FROM appointment WHERE company_id=OLD.id;
 DELETE FROM sale WHERE company_id=OLD.id;
 DELETE FROM sale_item WHERE company_id=OLD.id;
 DELETE FROM financial_entry WHERE company_id=OLD.id;
 DELETE FROM club_member WHERE company_id=OLD.id;
 DELETE FROM club_plan WHERE company_id=OLD.id;
 DELETE FROM customer WHERE company_id=OLD.id;
 DELETE FROM professional WHERE company_id=OLD.id;
 DELETE FROM service WHERE company_id=OLD.id;
 DELETE FROM service_category WHERE company_id=OLD.id;
 DELETE FROM product WHERE company_id=OLD.id;
 DELETE FROM subscription WHERE company_id=OLD.id;
 DELETE FROM invoice_simulated WHERE company_id=OLD.id;
 DELETE FROM trial_identity WHERE company_id=OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS native_appointment_conflict_insert BEFORE INSERT ON appointment
WHEN NEW.status NOT IN ('cancelado','faltou','nao_compareceu') BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM appointment a LEFT JOIN service s ON s.id=a.service_id
 WHERE a.company_id=NEW.company_id AND a.professional_id=NEW.professional_id AND a.status NOT IN ('cancelado','faltou','nao_compareceu')
 AND julianday(a.scheduled_at) < julianday(NEW.scheduled_at)+COALESCE((SELECT duration_minutes FROM service WHERE id=NEW.service_id),30)/1440.0
 AND julianday(NEW.scheduled_at) < julianday(a.scheduled_at)+COALESCE(s.duration_minutes,30)/1440.0)
 THEN RAISE(ABORT,'Esse horário acabou de ser reservado, escolha outro') END;
END;
CREATE TRIGGER IF NOT EXISTS native_appointment_conflict_update BEFORE UPDATE OF scheduled_at,professional_id,service_id,status ON appointment
WHEN NEW.status NOT IN ('cancelado','faltou','nao_compareceu') BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM appointment a LEFT JOIN service s ON s.id=a.service_id
 WHERE a.id<>NEW.id AND a.company_id=NEW.company_id AND a.professional_id=NEW.professional_id AND a.status NOT IN ('cancelado','faltou','nao_compareceu')
 AND julianday(a.scheduled_at) < julianday(NEW.scheduled_at)+COALESCE((SELECT duration_minutes FROM service WHERE id=NEW.service_id),30)/1440.0
 AND julianday(NEW.scheduled_at) < julianday(a.scheduled_at)+COALESCE(s.duration_minutes,30)/1440.0)
 THEN RAISE(ABORT,'Esse horário acabou de ser reservado, escolha outro') END;
END;
CREATE TRIGGER IF NOT EXISTS native_appointment_complete AFTER UPDATE OF status ON appointment
WHEN NEW.status='concluido' AND OLD.status<>'concluido' BEGIN
 UPDATE customer SET total_appointments=COALESCE(total_appointments,0)+1,last_appointment_at=NEW.scheduled_at WHERE id=NEW.customer_id AND company_id=NEW.company_id;
END;

CREATE TRIGGER IF NOT EXISTS native_sale_no_reopen BEFORE UPDATE OF status ON sale
WHEN OLD.status IN ('fechada','cancelada') AND NEW.status<>OLD.status BEGIN SELECT RAISE(ABORT,'Comanda encerrada não pode ser reaberta'); END;
CREATE TRIGGER IF NOT EXISTS native_sale_item_insert BEFORE INSERT ON sale_item BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sale WHERE id=NEW.sale_id AND company_id=NEW.company_id AND status='aberta') THEN RAISE(ABORT,'Comanda indisponível') END;
 SELECT CASE WHEN NEW.quantidade<=0 OR NEW.preco_cents<0 THEN RAISE(ABORT,'Quantidade ou preço inválido') END;
END;
CREATE TRIGGER IF NOT EXISTS native_sale_item_update BEFORE UPDATE OF preco_cents,quantidade,ref_id,sale_id ON sale_item BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sale WHERE id=OLD.sale_id AND status='aberta') THEN RAISE(ABORT,'Comanda encerrada') END;
 SELECT CASE WHEN NEW.quantidade<=0 OR NEW.preco_cents<0 THEN RAISE(ABORT,'Quantidade ou preço inválido') END;
END;
CREATE TRIGGER IF NOT EXISTS native_sale_item_delete BEFORE DELETE ON sale_item
WHEN EXISTS(SELECT 1 FROM sale WHERE id=OLD.sale_id AND status='fechada') BEGIN SELECT RAISE(ABORT,'Comanda encerrada'); END;

DROP TRIGGER IF EXISTS native_sale_close;
CREATE TRIGGER IF NOT EXISTS native_sale_close_v2 AFTER UPDATE OF status ON sale
WHEN OLD.status='aberta' AND NEW.status='fechada' BEGIN
 UPDATE sale_item SET comissao_percentual=COALESCE(
 (SELECT CASE WHEN ps.commission_type='fixed' THEN 0 WHEN ps.commission_type='percent' THEN ps.commission_value ELSE ps.comissao_percentual END
 FROM professional_service ps WHERE ps.professional_id=sale_item.professional_id AND ps.service_id=sale_item.ref_id AND sale_item.tipo='servico'),
 (SELECT CASE WHEN p.commission_type='fixed' THEN 0 WHEN p.commission_type='percent' THEN COALESCE(p.commission_value,p.comissao_percentual) ELSE p.comissao_percentual END FROM professional p WHERE p.id=sale_item.professional_id),0) WHERE sale_id=NEW.id;
 UPDATE sale_item SET comissao_cents=CAST(ROUND(COALESCE(
 (SELECT ps.commission_value*100*sale_item.quantidade FROM professional_service ps WHERE ps.professional_id=sale_item.professional_id AND ps.service_id=sale_item.ref_id AND sale_item.tipo='servico' AND ps.commission_type='fixed'),
 (SELECT p.commission_value*100*sale_item.quantidade FROM professional p WHERE p.id=sale_item.professional_id AND p.commission_type='fixed'
 AND NOT EXISTS(SELECT 1 FROM professional_service ps WHERE ps.professional_id=p.id AND ps.service_id=sale_item.ref_id AND sale_item.tipo='servico' AND (ps.commission_type IN ('fixed','percent') OR ps.comissao_percentual IS NOT NULL))),
 preco_cents*quantidade*comissao_percentual/100)) AS INTEGER) WHERE sale_id=NEW.id;
 UPDATE product SET estoque=MAX(0,estoque-COALESCE((SELECT SUM(i.quantidade) FROM sale_item i WHERE i.sale_id=NEW.id AND i.tipo='produto' AND i.ref_id=product.id),0)) WHERE company_id=NEW.company_id AND estoque IS NOT NULL;
 UPDATE sale SET total_cents=MAX(0,COALESCE((SELECT SUM(preco_cents*quantidade) FROM sale_item WHERE sale_id=NEW.id),0)-COALESCE(NEW.desconto_cents,0)),closed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id;
 INSERT INTO financial_entry(id,company_id,type,status,amount,date,description,category,reference_appointment_id)
 SELECT 'sale:'||id,company_id,'entrada','confirmado',total_cents/100.0,date('now'),'Comanda '||COALESCE(forma_pagamento,''),'sale:'||id,appointment_id FROM sale WHERE id=NEW.id
 ON CONFLICT(id) DO NOTHING;
 UPDATE appointment SET status='concluido',completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.appointment_id AND company_id=NEW.company_id AND status<>'concluido';
 UPDATE customer SET fidelidade_contador=COALESCE(fidelidade_contador,0)+COALESCE((SELECT SUM(quantidade) FROM sale_item WHERE sale_id=NEW.id AND tipo='servico'),0)
 WHERE id=NEW.customer_id AND company_id=NEW.company_id AND EXISTS(SELECT 1 FROM company WHERE id=NEW.company_id AND fidelidade_ativa=1);
END;
