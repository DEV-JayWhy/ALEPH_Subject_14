export const normalizeUsername = value => typeof value==='string'?value.trim().toLowerCase():'';
export const validUsername = value => /^[a-z][a-z0-9._-]{2,31}$/.test(value);
export function registrationIssue({username,password,displayName}) {
 if(!validUsername(username))return '아이디는 영문자로 시작하는 영문·숫자·점·밑줄·하이픈 3~32자로 입력해 주세요.';
 if(['admin','administrator','root','system'].includes(username))return '사용할 수 없는 아이디입니다.';
 if(typeof password!=='string'||password.length<10||password.length>128)return '비밀번호는 10~128자로 입력해 주세요.';
 if(typeof displayName!=='string'||!displayName.trim()||displayName.trim().length>50)return '이름 또는 닉네임을 1~50자로 입력해 주세요.';
 return null;
}
