const databaseKey="modaCenterUsers";
const sessionKey="modaCenterSession";
const backdrop=document.getElementById("authBackdrop");
const app=document.querySelector(".app");
const title=document.getElementById("authTitle");
const description=document.getElementById("authDescription");
const toast=document.getElementById("toast");
const accountMessage=document.getElementById("accountMessage");

// Cache em memoria para evitar leituras repetidas durante os testes.
const localCache={users:null,session:null};

// Camada de dados: substitua estes metodos por chamadas a uma API/banco no futuro.
const database={
  getUsers(){
    if(Array.isArray(localCache.users))return localCache.users;
    try{
      const users=JSON.parse(localStorage.getItem(databaseKey)||"[]");
      localCache.users=Array.isArray(users)?users:[];
    }catch(error){localCache.users=[]}
    return localCache.users;
  },
  saveUsers(users){
    localCache.users=users;
    localStorage.setItem(databaseKey,JSON.stringify(users));
  },
  getSession(){
    if(localCache.session!==null)return localCache.session;
    try{localCache.session=JSON.parse(localStorage.getItem(sessionKey)||"null")}
    catch(error){localCache.session=null}
    return localCache.session;
  },
  saveSession(session){
    localCache.session=session;
    localStorage.setItem(sessionKey,JSON.stringify(session));
  },
  clearSession(){
    localCache.session=null;
    localStorage.removeItem(sessionKey);
  }
};

function getUsers(){
  return database.getUsers();
}

// Atualiza as mensagens de validacao sem alterar a estrutura dos formularios.
function setNote(formId,message){document.getElementById(formId).textContent=message}

function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);
}

function switchTab(tab){
  const isLogin=tab==="login";
  document.querySelectorAll(".auth-tab").forEach(button=>button.classList.toggle("active",button.dataset.tab===tab));
  document.querySelectorAll(".auth-form").forEach(form=>form.classList.toggle("active",form.id===(isLogin?"loginForm":"registerForm")));
  title.textContent=isLogin?"Acesse sua conta":"Crie sua conta";
  description.textContent=isLogin?"Entre para acompanhar suas lojas e favoritos.":"Cadastre-se para ter uma experiência completa.";
  setNote("loginNote","");setNote("registerNote","");
}

function openAuth(tab){switchTab(tab);backdrop.classList.add("open");setTimeout(()=>backdrop.querySelector("input")?.focus(),100)}
function closeAuth(){backdrop.classList.remove("open")}

function showAccount(user){
  accountMessage.textContent="Bem-vindo(a), "+user.name+". Sua conta está ativa.";
  app.classList.add("account-active");
  window.scrollTo(0,0);
}

function showHome(){
  app.classList.remove("account-active");
  window.scrollTo(0,0);
}

// Eventos da tela inicial, das abas e do fechamento do modal.
document.querySelectorAll(".actions button").forEach(button=>button.addEventListener("click",()=>openAuth(button.dataset.auth)));
document.querySelectorAll(".auth-tab").forEach(button=>button.addEventListener("click",()=>switchTab(button.dataset.tab)));
document.getElementById("closeModal").addEventListener("click",closeAuth);
backdrop.addEventListener("click",event=>{if(event.target===backdrop)closeAuth()});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeAuth()});

// Cadastro local usado enquanto o banco definitivo ainda nao foi conectado.
document.getElementById("registerForm").addEventListener("submit",event=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const name=form.get("name").trim();
  const email=form.get("email").trim().toLowerCase();
  const users=getUsers();
  if(users.some(user=>user.email===email)){setNote("registerNote","Este e-mail já está cadastrado.");return}
  users.push({id:Date.now(),name,email,password:form.get("password")});
  database.saveUsers(users);
  event.currentTarget.reset();
  switchTab("login");
  setNote("loginNote","Conta criada. Agora entre com seus dados.");
});

// Login local: valida os dados armazenados e cria uma sessao de teste.
document.getElementById("loginForm").addEventListener("submit",event=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const email=form.get("email").trim().toLowerCase();
  const user=getUsers().find(item=>item.email===email&&item.password===form.get("password"));
  if(!user){setNote("loginNote","E-mail ou senha inválidos.");return}
  database.saveSession({id:user.id,name:user.name,email:user.email});
  event.currentTarget.reset();closeAuth();showAccount(user);
});

// Remove a sessao atual e retorna para a tela inicial.
document.getElementById("logoutButton").addEventListener("click",()=>{
  database.clearSession();
  showHome();
  showToast("Você saiu da sua conta.");
});

// Restaura a sessao salva quando a pagina e aberta novamente.
try{
  const session=database.getSession();
  if(session?.name)showAccount(session);
}catch(error){database.clearSession()}
