const databaseKey="modaCenterUsers";
const sessionKey="modaCenterSession";
const backdrop=document.getElementById("authBackdrop");
const app=document.querySelector(".app");
const title=document.getElementById("authTitle");
const description=document.getElementById("authDescription");
const toast=document.getElementById("toast");
const accountMessage=document.getElementById("accountMessage");

function getUsers(){
  try{return JSON.parse(localStorage.getItem(databaseKey)||"[]");}
  catch(error){return []}
}

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

document.querySelectorAll(".actions button").forEach(button=>button.addEventListener("click",()=>openAuth(button.dataset.auth)));
document.querySelectorAll(".auth-tab").forEach(button=>button.addEventListener("click",()=>switchTab(button.dataset.tab)));
document.getElementById("closeModal").addEventListener("click",closeAuth);
backdrop.addEventListener("click",event=>{if(event.target===backdrop)closeAuth()});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeAuth()});

document.getElementById("registerForm").addEventListener("submit",event=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const name=form.get("name").trim();
  const email=form.get("email").trim().toLowerCase();
  const users=getUsers();
  if(users.some(user=>user.email===email)){setNote("registerNote","Este e-mail já está cadastrado.");return}
  users.push({id:Date.now(),name,email,password:form.get("password")});
  localStorage.setItem(databaseKey,JSON.stringify(users));
  event.currentTarget.reset();
  switchTab("login");
  setNote("loginNote","Conta criada. Agora entre com seus dados.");
});

document.getElementById("loginForm").addEventListener("submit",event=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const email=form.get("email").trim().toLowerCase();
  const user=getUsers().find(item=>item.email===email&&item.password===form.get("password"));
  if(!user){setNote("loginNote","E-mail ou senha inválidos.");return}
  localStorage.setItem(sessionKey,JSON.stringify({id:user.id,name:user.name,email:user.email}));
  event.currentTarget.reset();closeAuth();showAccount(user);
});

document.getElementById("logoutButton").addEventListener("click",()=>{
  localStorage.removeItem(sessionKey);
  showHome();
  showToast("Você saiu da sua conta.");
});

try{
  const session=JSON.parse(localStorage.getItem(sessionKey)||"null");
  if(session?.name)showAccount(session);
}catch(error){localStorage.removeItem(sessionKey)}
