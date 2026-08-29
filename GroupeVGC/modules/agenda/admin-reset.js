(function(){
const form=document.getElementById('resetForm'),msg=document.getElementById('resetMsg');
const params=new URLSearchParams(location.hash.replace(/^#/,''));
const accessToken=params.get('access_token')||'';
const type=params.get('type')||'';
if(!accessToken){msg.textContent='This password reset link is missing or expired. Return to Administration and request a new reset email.';form.querySelector('button[type="submit"]').disabled=true;return}
if(type&&type!=='recovery')console.warn('Unexpected auth flow type',type);
form.onsubmit=async(e)=>{e.preventDefault();const p=document.getElementById('newPassword').value,c=document.getElementById('confirmPassword').value;if(p.length<8){msg.textContent='Use at least 8 characters.';return}if(p!==c){msg.textContent='Passwords do not match.';return}msg.textContent='Updating password…';try{await RBMData.updatePassword(accessToken,p);msg.textContent='Password updated successfully. You can now sign in to Groupe VGC Administration.';form.querySelector('button[type="submit"]').disabled=true;history.replaceState(null,'',location.pathname)}catch(err){msg.textContent=err.message||'Unable to update password. Request a new reset email.'}};
})();
