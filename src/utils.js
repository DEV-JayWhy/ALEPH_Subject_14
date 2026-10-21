export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function canWrite(profile) { return profile?.role==='admin' && profile?.status==='approved'; }
export function memberLabel(profile) { return ({pending:'가입 승인 대기',approved:profile?.role==='admin'?'관리자':'승인된 회원',rejected:'가입 신청 거절',expelled:'이용 권한 해제'})[profile?.status] || '방문자'; }
export function fileAllowed(file) { return ['image/png','image/jpeg','image/webp','image/gif'].includes(file.type) && file.size>0 && file.size<=5*1024*1024; }
export function readableError(error) {
 const message = error?.message || '';
 if (/Invalid login credentials/i.test(message)) return '이메일 또는 비밀번호를 확인해 주세요.';
 if (/Email not confirmed/i.test(message)) return '이메일 인증 후 로그인해 주세요. 가입 신청 때 받은 메일을 확인해 주세요.';
 if (/already registered/i.test(message)) return '이미 신청한 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.';
 if (/rate limit|too many/i.test(message)) return '요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.';
 if (/weak|password/i.test(message)) return '비밀번호 조건을 확인해 주세요. 12자 이상을 권장합니다.';
 if (/fetch|network|Failed to fetch/i.test(message)) return '서버에 연결하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.';
 if (/row.level|permission|denied/i.test(message)) return '이 작업을 수행할 권한이 없습니다. 계정 상태를 확인해 주세요.';
 return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
