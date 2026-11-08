// Deployed with verify_jwt=false because login/accept are public; all other actions validate getUser().
// @ts-nocheck
import {createClient} from 'npm:@supabase/supabase-js@2.101.0';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Content-Type':'application/json','Cache-Control':'no-store'};
const normalize=(s:string)=>s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const check=(r:any)=>{if(r.error)throw new Error(r.error.message);return r.data;};
const strong=(p:any)=>typeof p==='string'&&p.length>=8&&p.length<=128;
const legacyPassword=(p:string,role:string)=>role==='athlete'?p.replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$3$2$1').replace(/\D/g,''):p;
async function profile(user:string){return check(await admin.from('prorun_accounts').select('*').eq('user_id',user).eq('active',true).single());}
async function scopedAthlete(actor:any,id:string){const row=check(await admin.from('athletes').select('id,organization_id').eq('id',id).single());if(!actor.platform_admin&&row.organization_id!==actor.organization_id)throw new Error('Atleta fora da sua organização.');return row;}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 const respond=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers});
 try{
  if(req.method!=='POST')return respond({error:'Método inválido.'},405);
  const body=await req.json(),action=body.action;
  if(action==='login'){
   if(typeof body.username!=='string'||body.username.length>200||typeof body.password!=='string'||body.password.length>128)return respond({error:'Credenciais inválidas.'},401);
   const login=normalize(body.username);if(!check(await admin.rpc('prorun_login_allowed',{p_login:login})))return respond({error:'Muitas tentativas. Aguarde 15 minutos.'},429);let account=check(await admin.from('prorun_accounts').select('*').eq('login',login).maybeSingle());
   let email=body.username.trim().toLowerCase(),password=body.password;
   if(account){if(!account.active)return respond({error:'Acesso desativado. Consulte o administrador.'},401);const u=check(await admin.auth.admin.getUserById(account.user_id));email=u.user.email;}
   else{
    const legacy=check(await admin.rpc('prorun_legacy_login',{p_login:login,p_password:body.password}));
    if(!legacy)return respond({error:'Credenciais inválidas. Utilize seu convite de acesso.'},401);
    email=`${legacy.id}@accounts.prorunlb.invalid`;password=await digest('prorun:legacy:'+legacyPassword(body.password,legacy.role));
    const created=check(await admin.auth.admin.createUser({email,password,email_confirm:true}));
    const inserted=await admin.from('prorun_accounts').insert({user_id:created.user.id,login:legacy.login,name:legacy.name,role:legacy.role,platform_admin:legacy.platform_admin,organization_id:legacy.organization_id,athlete_id:legacy.athlete_id,must_change_password:true}).select('*').single();
    if(inserted.error){await admin.auth.admin.deleteUser(created.user.id);throw new Error('Não foi possível migrar o acesso. Tente novamente.');}account=inserted.data;
   }
   const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
   let signed=await auth.auth.signInWithPassword({email,password});
   if(signed.error&&account.must_change_password){
    const legacy=check(await admin.rpc('prorun_legacy_login',{p_login:login,p_password:body.password}));
    if(legacy)signed=await auth.auth.signInWithPassword({email,password:await digest('prorun:legacy:'+legacyPassword(body.password,legacy.role))});
   }
   if(signed.error)return respond({error:'Credenciais inválidas.'},401);
   return respond({session:signed.data.session,account});
  }
  if(action==='accept'){
   if(typeof body.token!=='string'||body.token.length<32||!strong(body.password))throw new Error('Informe o convite e uma senha de pelo menos 8 caracteres.');
   const invitation=check(await admin.from('prorun_invitations').select('*').eq('token_hash',await digest(body.token)).is('accepted_at',null).gt('expires_at',new Date().toISOString()).maybeSingle());
   if(!invitation)throw new Error('Convite inválido, expirado ou já utilizado. Solicite um novo link ao treinador.');
   const invitationEmail=invitation.platform_admin&&invitation.email==='admin-bootstrap@accounts.prorunlb.invalid'?body.email:invitation.email;
   if(typeof invitationEmail!=='string'||!/^\S+@\S+\.\S+$/.test(invitationEmail))throw new Error('Informe seu e-mail para ativar o acesso.');
   if(!invitation.platform_admin&&(typeof body.email!=='string'||body.email.trim().toLowerCase()!==invitation.email.trim().toLowerCase()))throw new Error('Informe o mesmo e-mail que recebeu o convite.');
   const claimed=check(await admin.from('prorun_invitations').update({accepted_at:new Date().toISOString()}).eq('id',invitation.id).is('accepted_at',null).select('id').maybeSingle());if(!claimed)throw new Error('Convite já utilizado.');
   let createdId:string|null=null;
   try{
    if(invitation.account_id){check(await admin.auth.admin.updateUserById(invitation.account_id,{password:body.password}));check(await admin.from('prorun_accounts').update({must_change_password:false}).eq('user_id',invitation.account_id));}
    else{
     const created=await admin.auth.admin.createUser({email:invitationEmail,password:body.password,email_confirm:true});
     if(created.error){if(['email_exists','user_already_exists'].includes(created.error.code)||/already.*registered|already.*exists/i.test(created.error.message))throw new Error('Este e-mail já possui acesso. Entre com a conta existente. Para um perfil separado de aluno, peça um novo convite com outro e-mail.');throw created.error;}
     const u=created.data;createdId=u.user.id;
     check(await admin.from('prorun_accounts').insert({user_id:createdId,login:invitation.platform_admin?'leandro':normalize(invitation.email),name:invitation.name,organization_id:invitation.organization_id,role:invitation.role,athlete_id:invitation.athlete_id,platform_admin:invitation.platform_admin===true}));
    }
   }catch(error){if(createdId)await admin.auth.admin.deleteUser(createdId);await admin.from('prorun_invitations').update({accepted_at:null}).eq('id',invitation.id);throw error;}
   let login=invitation.platform_admin?'leandro':invitation.email;if(invitation.account_id){const existing=check(await admin.from('prorun_accounts').select('login').eq('user_id',invitation.account_id).single());login=existing.login;check(await admin.rpc('prorun_disable_legacy',{p_login:login}));}return respond({success:true,login,message:'Acesso criado. Entre com seu login e senha.'});
  }
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
  if(!token)return respond({error:'Entre novamente.'},401);
  const {data,error}=await admin.auth.getUser(token);if(error||!data.user)return respond({error:'Sessão inválida.'},401);
  const actor=await profile(data.user.id);
  if(action==='profile')return respond({account:actor});
  if(action==='password'){
   if(!strong(body.password))throw new Error('Use uma senha de pelo menos 8 caracteres.');
   check(await admin.auth.admin.updateUserById(data.user.id,{password:body.password}));
   check(await admin.from('prorun_accounts').update({must_change_password:false}).eq('user_id',actor.user_id));
   check(await admin.rpc('prorun_disable_legacy',{p_login:actor.login}));const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const signed=check(await auth.auth.signInWithPassword({email:data.user.email,password:body.password}));return respond({account:{...actor,must_change_password:false},session:signed.session});
  }
  if(actor.must_change_password)return respond({error:'Atualize sua senha antes de continuar.'},403);
  if(actor.role!=='coach')return respond({error:'Acesso exclusivo do treinador.'},403);
  if(action==='list'){
   let q=admin.from('prorun_accounts').select('user_id,organization_id,name,login,role,active,platform_admin,athlete_id');if(!actor.platform_admin)q=q.eq('organization_id',actor.organization_id).eq('role','athlete');
   return respond({accounts:check(await q.order('name'))});
  }
  if(action==='toggle'){
   const target=check(await admin.from('prorun_accounts').select('*').eq('user_id',body.userId).single());
   if(target.platform_admin||target.user_id===actor.user_id||(!actor.platform_admin&&(target.organization_id!==actor.organization_id||target.role!=='athlete')))return respond({error:'Sem permissão.'},403);
   check(await admin.from('prorun_accounts').update({active:body.active===true}).eq('user_id',target.user_id));return respond({success:true});
  }
  if(action==='invite'){
   const role=body.role==='coach'?'coach':'athlete';if(role==='coach'&&!actor.platform_admin)return respond({error:'Somente o administrador pode convidar treinadores.'},403);
   if(typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||typeof body.name!=='string'||!body.name.trim())throw new Error('Informe nome e e-mail válidos.');
   if(!body.resetUserId){
    const existingLogin=check(await admin.from('prorun_accounts').select('user_id').eq('login',normalize(body.email)).maybeSingle());
    if(existingLogin||normalize(body.email)===normalize(data.user.email||''))throw new Error('Este e-mail já possui acesso. Para um perfil separado de aluno, use outro e-mail. Para recuperar uma conta existente, use Redefinir acesso.');
   }
   let organization=actor.organization_id,athleteId=null,accountId=null;
   if(body.resetUserId){
    const target=check(await admin.from('prorun_accounts').select('*').eq('user_id',body.resetUserId).single());
    if(!target.active||target.platform_admin||target.role!==role||(!actor.platform_admin&&(target.organization_id!==actor.organization_id||target.role!=='athlete')))return respond({error:'Sem permissão para redefinir este acesso.'},403);
    organization=target.organization_id;athleteId=target.athlete_id;accountId=target.user_id;
   }else if(role==='coach'){
    organization=check(await admin.from('prorun_organizations').insert({name:body.organizationName?.trim()||body.name.trim()}).select('id').single()).id;
   }else{await scopedAthlete(actor,body.athleteId);athleteId=body.athleteId;const a=check(await admin.from('athletes').select('organization_id').eq('id',athleteId).single());organization=a.organization_id;}
   const raw=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
   check(await admin.from('prorun_invitations').insert({token_hash:await digest(raw),organization_id:organization,email:body.email.trim().toLowerCase(),name:body.name.trim(),role,athlete_id:athleteId,account_id:accountId,created_by:actor.user_id}));
   return respond({token:raw,expiresInDays:7});
  }
  return respond({error:'Ação inválida.'},400);
 }catch(error){console.error('Access operation failed:',error.message);return new Response(JSON.stringify({error:'Não foi possível concluir. '+String(error.message).slice(0,200)}),{status:400,headers});}
});
