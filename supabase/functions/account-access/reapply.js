// Password ownership is required before reopening a rejected application.
// Return no session to the caller and preserve the account UUID and password.
export async function reapply({profile,password,displayName,auth,service}) {
 if(profile.role!=='member'||profile.status!=='rejected')return {status:409,message:'이미 사용 중인 아이디입니다.'};
 const {data,error}=await auth.auth.signInWithPassword({email:profile.email,password});
 if(error||!data.session||data.user?.id!==profile.id){
  if(data.session)await auth.auth.signOut({scope:'local'});
  return {status:401,message:'재신청하려면 기존 가입 신청 때 사용한 비밀번호를 입력해 주세요.'};
 }
 const {error:signOutError}=await auth.auth.signOut({scope:'local'});
 if(signOutError)return {status:503,message:'재신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'};
 // Compare the status at update time so concurrent admin actions cannot be undone.
 const {data:updated,error:updateError}=await service.from('profiles')
  .update({status:'pending',reviewed_at:null,display_name:displayName.trim()})
  .eq('id',profile.id).eq('role','member').eq('status','rejected').select('id');
 if(updateError)return {status:503,message:'재신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'};
 if(!updated?.length)return {status:409,message:'계정 상태가 변경되었습니다. 새로고침 후 확인해 주세요.'};
 return {status:200,message:'가입 재신청을 접수했습니다. 관리자 승인을 기다려 주세요.'};
}
