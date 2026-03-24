
목표
- 학생 비교 수행 화면에서 학생 식별 정보(학생코드/이름/마스킹 식별자)가 UI, 클라이언트 상태, 로그에 노출될 가능성을 전체 제거하고, 응답 표시는 “응답 A / 응답 B”만 유지합니다.

문제 원인(현재 코드 기준)
1) 익명화가 “렌더링 일부”에만 적용됨
- `ComparisonSession.tsx` 카드 타이틀은 정리되어 있지만, 데이터 모델에는 여전히 `student_code`가 포함되어 있습니다.
- `fetchProjectAndResponses`가 `student_responses`를 `select('*')`로 가져와 학생코드를 클라이언트로 내려받습니다.

2) 비교 로직 계층에서 학생코드를 계속 보유/로그 출력
- `useAdvancedComparisonLogic.tsx` / `comparisonAlgorithm.ts` 타입과 디버그 로그에서 `student_code`를 지속 사용합니다.
- 특히 콘솔에 `responseA.student_code vs responseB.student_code`가 찍혀 익명성 정책과 충돌합니다.

3) 레거시 비교 화면 잔존
- `src/pages/CompareSession.tsx` + `ResponseCard` 경로에 `ownerMasked` 구조가 남아 있어, 향후/실수로 재연결 시 식별자 노출이 재발할 수 있습니다.
- 즉, “한 곳 수정 → 다른 경로/잔여 코드에서 재노출” 구조가 계속 발생 가능한 상태입니다.

구현 계획
1. 비교 화면 데이터 계약(Contract) 익명화
- 학생 비교 UI용 응답 타입을 `id`, `response_text`, `question_number` 중심으로 축소하고 `student_code`를 제외합니다.
- `ComparisonSession.tsx` 응답 조회를 `select('id, response_text, question_number, project_id')`처럼 최소 컬럼으로 변경합니다.
- 학생 비교 흐름에서 `select('*')` 사용을 제거해 네트워크 응답 레벨에서도 식별자 미전달을 보장합니다.

2. 비교 로직 훅/알고리즘에서 식별자 의존 제거
- `useAdvancedComparisonLogic.tsx`, `comparisonAlgorithm.ts`의 `StudentResponse` 인터페이스에서 `student_code` 제거(또는 내부 비식별 키만 사용).
- 페어 생성/우선순위/저장 로직은 전부 `response id` 기반으로 동작하도록 정리합니다.
- 디버그 로그에서 학생코드 출력 전면 삭제(결정/시간/응답ID만 남기거나 로그 자체 축소).

3. UI 익명화 강제
- 비교 카드 헤더는 “응답 A / 응답 B”만 남기고, 추가 배지/보조 텍스트에 개인 식별 정보가 들어갈 수 없도록 고정합니다.
- 토스트/상태 메시지/보조 컴포넌트에서도 학생 식별 문자열이 삽입되지 않도록 점검합니다.

4. 레거시 경로 정리(재발 방지 핵심)
- `CompareSession.tsx`의 `ownerMasked` 기반 목업 구조를 익명 정책에 맞춰 정리하거나, 미사용이면 제거 대상로 분류합니다.
- `ResponseCard`의 `ownerMasked` prop을 제거(또는 사용 금지)해서 컴포넌트 레벨에서 식별자 주입 자체를 차단합니다.
- 즉, “식별자 필드가 들어올 수 없는 타입 구조”로 재설계합니다.

5. 검증(전역)
- 코드 검색으로 `student_code`, `ownerMasked`, `학생 #`, `학생 코드:`가 학생 비교 플로우(`ComparisonSession`, 관련 훅/알고리즘/카드)에 남아있는지 재검증.
- 학생 실사용 경로 `/compare/:projectId`에서 A/B 카드, 토스트, 진행바, 완료 화면까지 식별자 미노출 확인.
- 개발자도구 네트워크 페이로드에서 학생 비교 화면 요청에 `student_code`가 내려오지 않는지 확인(학생 화면 기준).

기술 메모
- 관리자/결과 집계 화면의 학생코드 사용은 별도 정책이므로 학생 비교 수행 플로우와 분리해서 처리합니다.
- 이번 수정의 핵심은 “보이는 텍스트 제거”가 아니라 “데이터 계약 + 타입 + 로그 + 레거시 경로”를 동시에 익명화하는 것입니다.
