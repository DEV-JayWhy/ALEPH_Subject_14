# ALEPH_Subject_14 · 배움의 기록

수업과 개인 공부를 기록하고, 승인된 회원에게 비공개 글을 공유하는 학습 블로그.

- 배포: https://aleph-subject-14.vercel.app/
- 계획: [plan.md](plan.md), 이전 버전: [plans](plans/)
- 스택: Vite, JavaScript, Tiptap, DOMPurify, Supabase Auth/Postgres/Storage

## 중간 점검 1차

구현: 공개 글 목록·상세·주제 필터·검색, 가입 신청·로그인·로그아웃, 관리자 전용 회원 수락·거절, 이미지와 서식을 포함한 관리자 글쓰기, PC·모바일 레이아웃.

## 중간 점검 2차 구현

- 작성·수정 시 공개/비공개 선택, 관리자 상세 화면의 수정·삭제 버튼.
- 기존 글과 이미지·서식을 불러와 수정하며 updated_at 조건으로 동시 수정 덮어쓰기를 차단.
- 삭제 확인, 삭제 후 이미지 접근 차단과 파일 정리.
- 회원 관리의 전체 회원에서 승인 회원 블랙 처리, 블랙 목록 및 해제(승인 대기 복귀). 현재 DB 상태로 접근 권한 검사, 기존 화면 포커스/15초 상태 확인.
- 정렬·글꼴·크기·강조색·구분선·서식 초기화, 표 행·열 편집 및 셀 병합·분할.
- 검증 결과와 미확인 항목: [2차 검증 기록](docs/checkpoint-2-verification.md).

관리자 아이디는 admin이다. 비밀번호는 소유자가 직접 설정한 기존 값을 사용한다. 신규 회원은 이메일 없이 아이디·비밀번호·닉네임으로 가입 신청한다. 일반 회원의 승인 여부는 관리자가 결정한다.

## 실행

```sh
npm ci
npm run build
npm test
npm run dev
```

브라우저용 publishable key는 공개 설정이다. 데이터 권한은 RLS로 제한한다. 서비스 역할 키와 비밀번호는 소스에 넣지 않는다.

## 권한 및 검증

- `db/schema.sql`: 최초 스키마, 가입 시 pending 프로필, 관리자 전용 변경 정책.
- 프로필의 role/status는 user_metadata와 독립적이며 일반 회원이 바꿀 수 없다.
- 비공개 이미지는 직접 다운로드할 때마다 Storage RLS를 검사한다. 공개 bucket이나 지속 서명 URL을 사용하지 않는다.
- `tests/rls.integration.sql`: 트랜잭션 내 임시 자료만 사용하고 ROLLBACK하는 권한 검증 스크립트. 실행 결과는 검증 문서에서 구분한다.
- 인증 기본 URL 및 허용 redirect는 배포 도메인으로 설정한다.
- 가입과 로그인은 account-access Edge Function이 처리한다. 비밀번호 검증·해시는 Supabase Auth가 맡으며 메일은 발송하지 않는다.
- db/username-auth.sql은 기존 계정·글을 보존하는 아이디 전환 스키마 변경이다.
- supabase/functions/account-access 소스와 src/account-rules.js의 검증 규칙을 함께 배포한다.
- SMTP와 이메일 비밀번호 복구는 사용하지 않는다. 새 가입·로그인 실제 성공 확인은 검증 문서에 별도로 기록한다.
