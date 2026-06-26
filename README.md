# my-account-book-backend

어느 순간 통장이 텅장이 되어 있는 모습을 보고 수입과 지출을 관리하기 위한 프로젝트입니다.

## 기술 스택

- **NestJS 10** / TypeScript
- **PostgreSQL** + TypeORM (마이그레이션 기반)
- **Redis** — refresh 토큰 저장 및 블랙리스트
- **JWT** 인증 (access / refresh)
- **Swagger** API 문서

## 도메인 모듈

| 모듈 | 역할 |
| --- | --- |
| `auth` | 회원가입·로그인, JWT 발급/갱신 |
| `users` | 사용자 |
| `incomes` | 수입 |
| `expenses` | 지출 |
| `blacklist` | 무효화된 토큰 관리 |
| `audit` | 감사 로그 |
| `scheduler` | 주기 작업 (in-process — 단일 인스턴스 전제) |
| `health` | 헬스체크 |

> ⚠️ 스케줄러가 in-process라 **인스턴스를 2개 이상 띄우면 중복 작업이 발생**합니다. 수평 확장이 필요하면 BullMQ+Redis나 pg-advisory-lock으로 옮기세요. (`Dockerfile` 상단 주석 참고)

## 로컬 개발

```bash
cp .env.example .env        # 값 채우기 (JWT 시크릿 등)
npm ci
npm run start:dev           # postgres/redis 컨테이너 기동 + nest watch
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/v1/api/docs`

### 환경 변수 (`.env.example`)

`APP_PORT`, `POSTGRES_*`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TZ`

## 테스트 / 마이그레이션

```bash
npm run test            # unit + integration
npm run test:unit
npm run test:e2e
npm run migration:generate   # 엔티티 변경 후 생성
npm run migration:run        # 적용
```

## 배포 파이프라인

`main` 브랜치 푸시 → GitHub Actions가 자동으로 빌드·배포합니다.

```text
push main → GitHub Actions (.github/workflows/deploy.yml)
  1. build-push  (GitHub 호스트 러너)        Docker 빌드 → ghcr.io push
  2. deploy      (배포 서버의 self-hosted 러너)  docker compose pull & up + 마이그레이션
```

### 필요한 설정

**GitHub repo secrets**: 없음 — `build-push`는 자동 제공되는 `GITHUB_TOKEN`으로 ghcr에 push합니다.

**배포 서버 (self-hosted 러너)**:

- GitHub Actions self-hosted 러너 등록 & 실행 (Settings → Actions → Runners)
- 러너 유저가 `docker` 그룹에 속하고 `docker login ghcr.io` 완료
- 러너 유저 홈에 `~/dev/my-account-book-backend/.env.prod` 보유 (compose가 읽음, sudo 불필요)

## 라이선스

(미정)
