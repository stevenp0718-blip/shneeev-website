(function(){
  var BOTS=["carl-bot","game status","giveaway boat","shneeev bot","statbot"];
  var online=document.getElementById("dcOnline"),faces=document.getElementById("dcFaces");
  if(!online||!faces||!window.fetch)return;
  fetch("https://discord.com/api/guilds/1536613616164405289/widget.json").then(function(r){return r.json()}).then(function(d){
    var m=(d.members||[]).filter(function(x){return BOTS.indexOf((x.username||"").toLowerCase())<0});
    if(!m.length)return;
    online.textContent=m.length+" online now";
    m.slice(0,8).forEach(function(x){var i=document.createElement("img");i.src=x.avatar_url;i.alt="";i.loading="lazy";faces.appendChild(i)});
    if(m.length>8){var b=document.createElement("b");b.textContent="+"+(m.length-8);faces.appendChild(b)}
  }).catch(function(){});
})();
