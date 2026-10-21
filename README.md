# ALEPH_Subject_14 · 배움의 기록

수업과 개인 공부를 기록하고, 승인된 회원에게 비공개 글을 공유하는 학습 블로그.

- 배포: https://aleph-subject-14.vercel.app/
- 계획: [plan.md](plan.md), 이전 버전: [plans](plans/)
- 스택: Vite, JavaScript, Tiptap, DOMPurify, Supabase Auth/Postgres/Storage

## 중간 점검 1차

구현: 공개 글 목록·상세·주제 필터·검색, 가입 신청·로그인·로그아웃, 관리자 전용 회원 수락·거절, 이미지와 서식을 포함한 관리자 글쓰기, PC·모바일 레이아웃.

2차 범위: 글 수정·삭제, 공개/비공개 전환 UI, 회원 추방 UI, 편집기 추가 기능.

관리자 계정의 초기 등록 및 비밀번호는 소유자가 직접 설정한다. 실제 인증·승인·글쓰기 검증이 끝나기 전에는 1차 완료로 보지 않는다.

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
- 외부 이메일 가입은 Supabase의 SMTP 발송 정책에 따라 별도 설정이 필요할 수 있다.
