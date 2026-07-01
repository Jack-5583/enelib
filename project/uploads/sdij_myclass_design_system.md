# myclass.sdij.com 디자인 시스템 정리

> 기준 파일: 저장된 HTML 3개 화면과 공통 CSS.  
> 목적: 디자인을 새로 해석하거나 개선하지 않고, 원본 화면에서 확인되는 디자인 규칙을 그대로 문서화한다.  
> 주의: 아래 값은 “권장값”이 아니라 “원본에서 확인된 값”이다. 색상, 여백, 폰트 크기, 굵기, border, underline, 탭 배경 등을 임의로 보정하지 않는다.

---

## 0. 확인된 화면 범위

| 파일/화면 | URL | 상위 메뉴 | 하위 탭 | 확인된 핵심 패턴 |
|---|---|---|---|---|
| 수업 관리 - 수강 강좌 | `/classes` | 수업관리 | 수강 강좌 | 강좌 리스트, 과목 배지, 상세보기 링크 버튼 |
| 출결과제 - 출석 현황 | `/dashboard` | 출결과제 | 출석 현황 | 월 헤더, 날짜/출석상태/수업정보 리스트 |
| 납부 내역 - 납부완료 | `/payment/history?year=2026&month=7` | 납부내역 | 납부완료 | 납부 리스트, 기간 셀렉트, 금액 정보, 안내 박스, 푸터 |

---

## 1. 기술/스타일 기반

### 1.1 CSS 기반

- Tailwind CSS v4.1.17 기반 유틸리티 클래스 사용.
- 공통 CSS 파일명: `root-Bw-Y_qvv.css`.
- 동영상 플레이어 영역에는 `starplyr.css` 계열 스타일이 포함되어 있으나, 업로드된 3개 화면의 핵심 레이아웃 분석에는 직접적인 UI 요소로 등장하지 않는다.
- 폰트는 Pretendard dynamic subset을 사용한다.

### 1.2 전역 폰트

```css
--font-sans: "Pretendard", ui-sans-serif, system-ui, sans-serif,
  "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

전역 적용 규칙:

```css
* {
  box-sizing: border-box;
  font-feature-settings: "ss05" 1, "ss06" 1, "ss10" 1;
  font-family: Pretendard, ui-sans-serif, system-ui, sans-serif;
}
```

### 1.3 기본 문서 배경/텍스트

```css
html,
body {
  color: var(--color-neutral-900);
  line-height: var(--line-height-normal);
  background-color: #fff;
}
```

---

## 2. 반응형 기준

HTML 초기 스크립트 기준:

```js
width <= 768   → mobile
width <= 1439  → tablet
else           → pc
```

CSS breakpoint에서 확인되는 주요 기준:

```css
@media (min-width: 1024px) { /* tablet 계열 */ }
@media (min-width: 1440px) { /* pc 계열 */ }
@media (min-width: 48rem) { /* md 계열 */ }
```

전역 safe-area / 앱 셸 변수:

```css
:root {
  --mobile-max-width: 1023px;
  --bottom-bar-h: 74px;
  --header-h: 80px;
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-area-top: var(--safe-top);
  --safe-area-bottom: calc(max(0px, var(--safe-bottom)) + var(--ios-toolbar-hitbox) + var(--chrome-toolbar-hitbox));
  --header-padding-top: calc(var(--header-h) + var(--safe-area-top));
  --bottom-padding: calc(var(--bottom-bar-h) + var(--safe-area-bottom));
}
```

---

## 3. 색상 토큰

### 3.1 핵심 색상

| 용도 | 값 | 원본 사용 위치 |
|---|---:|---|
| 기본 텍스트 | `#161616` | 본문, 메뉴 active, 탭 active, 제목 |
| 흰색 배경 | `#FFFFFF`, `#fff`, `bg-white` | 전체 배경, active 탭, 리스트 카드 |
| 연회색 배경 | `#f4f4f4` | inactive 탭, 과목 배지, 안내 박스 |
| 구분선 기본 | `#16161614` | `border-divider`, 리스트 border |
| 강한 구분선 | `rgba(22,22,22,0.96)` 또는 `#161616` | 섹션 헤더 하단선 |
| 비활성 메뉴 텍스트 | `rgba(22,22,22,0.3)` | 좌측 대메뉴 inactive |
| 보조 텍스트 | `rgba(22,22,22,0.5)` | inactive 탭 텍스트, 푸터 정보 |
| 보조 강조 텍스트 | `rgba(22,22,22,0.7)` | 푸터 링크 그룹 |
| 링크 블루 | `#002a9e` | 1:1 문의게시판 |
| 상태 블루 | `#003ce0` | 납부완료 상태 텍스트 |
| 배지 테두리 | `#c6c6c6` | 과목 배지 |
| 배지 텍스트 | `#393939` | 과목 배지 |

### 3.2 Tailwind theme 색상 일부

```css
--color-red-500: oklch(63.7% .237 25.331);
--color-red-600: oklch(57.7% .245 27.325);
--color-green-50: oklch(98.2% .018 155.826);
--color-green-200: oklch(92.5% .084 155.995);
--color-green-500: oklch(72.3% .219 149.579);
--color-green-700: oklch(52.7% .154 150.069);
--color-blue-50: oklch(97% .014 254.604);
--color-blue-200: oklch(88.2% .059 254.128);
--color-blue-500: oklch(62.3% .214 259.815);
--color-blue-600: oklch(54.6% .245 262.881);
--color-blue-700: oklch(48.8% .243 264.376);
--color-gray-50: oklch(98.5% .002 247.839);
--color-gray-100: oklch(96.7% .003 264.542);
--color-gray-200: oklch(92.8% .006 264.531);
--color-gray-300: oklch(87.2% .01 258.338);
--color-gray-500: oklch(55.1% .027 264.364);
--color-gray-600: oklch(44.6% .03 256.802);
--color-gray-900: oklch(21% .034 264.665);
--color-neutral-900: oklch(20.5% 0 0);
--color-black: #000;
--color-white: #fff;
```

---

## 4. 타이포그래피

### 4.1 전역 폰트 스케일

```css
--text-xs: .75rem;
--text-sm: .875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-6xl: 3.75rem;
```

### 4.2 전역 font-weight

```css
--font-weight-extralight: 200;
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### 4.3 프로젝트 커스텀 텍스트 클래스

```css
.text-body {
  font-size: 16px;
  line-height: 28px;
}

.text-heading-lg {
  font-size: 20px;
  line-height: 32px;
}

.text-heading-xl {
  font-size: 18px;
  line-height: 32px;
}

.text-small {
  font-size: 14px;
  line-height: 24px;
}
```

### 4.4 실제 화면별 타이포 사용

| 요소 | 클래스/값 | 설명 |
|---|---|---|
| 좌측 대메뉴 | `text-[32px] leading-[48px] font-extralight` | 수업관리 / 출결과제 / 납부내역 |
| 상단 사용자 정보 | `text-[18px] leading-[32px] font-normal` | 지점명 + 사용자명 |
| 탭 텍스트 | `text-body font-normal` | 하위 탭 |
| 리스트 제목 | `text-[20px] leading-[32px]` | 강좌명, 납부 항목명 |
| 리스트 본문 | `text-[16px] leading-[28px]` | 날짜, 시간, 금액, 상태 |
| 푸터 텍스트 | `text-[14px] leading-[24px]` | 약관/회사정보 |
| 배지 | `text-sm leading-6 font-semibold` | 과목/분류 배지 |

---

## 5. 공통 레이아웃

### 5.1 최상위 앱 컨테이너

3개 화면 공통 최상위 구조:

```html
<div class="flex h-dvh w-full flex-col bg-white">
  ...
</div>
```

- 전체 높이: `h-dvh`
- 전체 너비: `w-full`
- 방향: `flex-col`
- 배경: `bg-white`

### 5.2 중앙 정렬 래퍼

헤더 영역:

```html
<div class="flex w-full justify-center">
  <div class="w-full max-w-[1280px] px-10">
    ...
  </div>
</div>
```

- 최대 폭: `1280px`
- 좌우 padding: `px-10` → Tailwind spacing 기준 `2.5rem`

### 5.3 PC 본문 2컬럼 구조

좌측 메뉴와 우측 콘텐츠가 1280px 기준으로 나뉜다.

좌측 메뉴:

```html
<div class="fixed top-20 left-[max(calc(50vw-640px),0px)] z-10 h-[calc(100vh-350px)] w-[min(calc(50vw),640px)] px-10">
  ...
</div>
```

우측 콘텐츠:

```html
<div class="w-[min(calc(50vw),640px)]">
  <div class="px-10 py-20">
    ...
  </div>
</div>
```

- 전체 기준 폭: `1280px`
- 좌측 영역: 최대 `640px`
- 우측 영역: 최대 `640px`
- 우측 콘텐츠 padding: `px-10 py-20`
- 좌측 메뉴 위치: `fixed`, `top-20`, `z-10`

### 5.4 스크롤 영역

```html
<div class="scrollbar-hide flex-1 overflow-y-auto">
  ...
</div>
```

스크롤바 숨김:

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## 6. Header

### 6.1 헤더 고정 클래스

```css
.header-fixed {
  z-index: 50;
  backface-visibility: hidden;
  overscroll-behavior: contain;
  position: sticky;
  top: 0;
  transform: translate(0);
}
```

### 6.2 헤더 구조

```html
<div class="header-fixed flex w-full items-center justify-between bg-white px-0">
  <div class="tablet:gap-10 flex items-center gap-5">
    <div class="relative">
      <button class="flex items-center">
        <p class="text-[18px] leading-[32px] font-normal whitespace-nowrap text-[#161616]">
          <span class="mr-2 font-semibold">지점</span>
          사용자명 님
        </p>
      </button>
    </div>
  </div>
</div>
```

### 6.3 헤더 디자인 규칙

- 배경은 흰색이다: `bg-white`.
- 헤더 안쪽 x padding은 없다: `px-0`.
- 사용자 정보는 18px / 32px / normal이다.
- 지점명만 `font-semibold`, `mr-2`를 사용한다.
- 텍스트 색상은 `#161616`이다.

---

## 7. 좌측 대메뉴

### 7.1 메뉴 항목

확인된 상위 메뉴:

```txt
수업관리
출결과제
납부내역
```

### 7.2 Active 상태

```html
<button class="text-left text-[32px] leading-[48px] font-extralight text-[#161616] underline decoration-1 [text-decoration-skip-ink:none] [text-underline-position:from-font]">
  메뉴명
</button>
```

- 글자 크기: `32px`
- 줄높이: `48px`
- 굵기: `font-extralight` → 200
- 색상: `#161616`
- 밑줄: `underline decoration-1`
- underline offset은 전역 `.underline { text-underline-offset: 3px; }` 적용
- 텍스트 정렬: `text-left`

### 7.3 Inactive 상태

```html
<button class="text-left text-[32px] leading-[48px] font-extralight text-[rgba(22,22,22,0.3)]">
  메뉴명
</button>
```

- active와 동일한 크기/굵기 유지
- 색상만 `rgba(22,22,22,0.3)`로 낮춘다.
- inactive에는 underline을 넣지 않는다.

---

## 8. 하위 탭 / segmented tabs

### 8.1 공통 탭 컨테이너

```html
<div class="tablet:pt-16 pc:pt-0 flex w-full pt-10">
  ...tabs
</div>
```

- 기본 top padding: `pt-10`
- tablet: `pt-16`
- pc: `pt-0`
- 방향: 가로 `flex`

### 8.2 Active 탭

```html
<button class="relative flex-1 px-0 py-[18px] z-10 bg-white">
  <div class="text-body font-normal break-keep text-[#161616]">
    탭명
  </div>
</button>
```

- 배경: `bg-white`
- z-index: `z-10`
- padding: `px-0 py-[18px]`
- 텍스트: `16px / 28px / normal`
- 텍스트 색상: `#161616`

### 8.3 Inactive 탭

```html
<button class="relative flex-1 px-0 py-[18px] bg-[#f4f4f4] -ml-[1px]">
  <div class="text-body font-normal break-keep text-[rgba(22,22,22,0.5)] opacity-90">
    탭명
  </div>
</button>
```

- 배경: `#f4f4f4`
- 왼쪽 겹침: `-ml-[1px]`
- 텍스트 색상: `rgba(22,22,22,0.5)`
- opacity: `0.9`

### 8.4 화면별 하위 탭

#### 수업관리

```txt
수강 강좌 / 대기 접수 현황 / 추가 대기 신청
```

#### 출결과제

```txt
출석 현황 / 진도/과제
```

#### 납부내역

```txt
납부완료 / 취소/환불
```

---

## 9. 리스트 패턴

### 9.1 공통 리스트 구분선

대부분의 리스트 아이템은 다음 border를 사용한다.

```html
<div class="border-divider border-b px-0 py-5">
  ...
</div>
```

커스텀 border 색상:

```css
.border-divider {
  border-color: #16161614;
}
```

`#16161614`는 `#161616`에 약 8% alpha가 적용된 색상이다.

---

## 10. 강좌 리스트 컴포넌트

사용 화면: `수업 관리 - 수강 강좌`

### 10.1 아이템 컨테이너

```html
<div class="border-divider border-b px-0 py-5">
  <div class="flex w-full flex-col items-start justify-start gap-2">
    ...
  </div>
</div>
```

- 하단 border 사용
- 좌우 padding 없음: `px-0`
- 상하 padding: `py-5`
- 내부는 세로 정렬

### 10.2 과목 배지

```html
<span class="inline-block rounded-[2px] border border-[#c6c6c6] bg-[#f4f4f4] px-1.5 text-sm text-[#393939] font-semibold leading-6">
  국어
</span>
```

| 속성 | 값 |
|---|---|
| display | `inline-block` |
| radius | `2px` |
| border | `1px solid #c6c6c6` |
| background | `#f4f4f4` |
| padding-x | `px-1.5` |
| font-size | `text-sm` = 14px |
| line-height | `leading-6` |
| weight | `font-semibold` = 600 |
| color | `#393939` |

### 10.3 강좌명 텍스트

```html
<p class="text-[20px] leading-[32px] font-normal text-[#161616]">
  강좌명
</p>
```

- 20px / 32px
- normal 400
- `#161616`

### 10.4 상세보기 링크 버튼

```html
<button class="flex-center rounded-[2px] font-normal transition-colors bg-transparent text-[#161616] underline decoration-solid max-w-[160px] h-12 justify-start px-0 py-2.5 font-normal text-base gap-1.5 disabled:cursor-not-allowed disabled:opacity-50">
  강좌 상세보기
</button>
```

- 배경: transparent
- 텍스트 색상: `#161616`
- underline 사용
- 최대 너비: `160px`
- 높이: `h-12`
- padding: `px-0 py-2.5`
- 글자 크기: `text-base`
- gap: `gap-1.5`
- disabled: `cursor-not-allowed`, `opacity-50`

### 10.5 확인된 배지 텍스트 예시

```txt
국어
수학1•수학2
실전모의
수리논술
```

---

## 11. 출석 현황 리스트 컴포넌트

사용 화면: `출결과제 - 출석 현황`

### 11.1 월 헤더

```html
<div class="flex-center-full relative gap-2 border-b-1 border-[#161616] px-0 pt-10 pb-5">
  <div class="text-heading-lg flex-1 overflow-hidden font-semibold overflow-ellipsis text-[#161616]">
    2026년 7월
  </div>
</div>
```

| 속성 | 값 |
|---|---|
| display | `flex-center-full` |
| gap | `gap-2` |
| border-bottom | `1px`, `#161616` |
| padding-top | `pt-10` |
| padding-bottom | `pb-5` |
| 텍스트 | `.text-heading-lg` = 20px / 32px |
| weight | `font-semibold` |
| color | `#161616` |

### 11.2 출석 아이템 컨테이너

```html
<div class="border-divider flex w-full items-start justify-start border-b px-0 py-5">
  <div class="flex w-full flex-col items-start justify-start">
    <div class="flex w-full cursor-pointer items-start justify-start gap-4">
      ...
    </div>
  </div>
</div>
```

- 리스트 아이템 전체가 클릭 가능 커서: `cursor-pointer`
- gap: `gap-4`
- 하단 구분선: `border-divider border-b`
- padding: `px-0 py-5`

### 11.3 날짜 영역

```html
<div class="flex w-[120px] flex-col items-start justify-center gap-1">
  <div class="flex items-end justify-start gap-1">
    <div class="text-heading-lg overflow-hidden font-normal text-nowrap overflow-ellipsis text-[#161616]">
      11일
    </div>
    <div class="flex flex-col items-center justify-center gap-2 py-0.5">
      <div class="text-body w-full overflow-hidden font-normal overflow-ellipsis text-[#161616]">
        (토)
      </div>
    </div>
  </div>
  <div class="flex items-center justify-start gap-1">
    <span class="text-body overflow-hidden font-normal text-nowrap overflow-ellipsis">
      출석 전
    </span>
  </div>
</div>
```

- 날짜 영역 폭: `120px`
- 날짜 숫자: `.text-heading-lg`, 20px / 32px, normal
- 요일: `.text-body`, 16px / 28px, normal
- 출석 상태: `.text-body`, 16px / 28px, normal

### 11.4 수업 정보 영역

```html
<div class="ms-2.5 flex min-h-px min-w-px flex-1 basis-0 flex-col items-start justify-center">
  <div class="flex w-full flex-wrap items-start justify-start gap-2 py-1">
    <span class="inline-block rounded-[2px] border border-[#c6c6c6] bg-[#f4f4f4] px-1.5 text-sm text-[#393939] font-semibold leading-6">
      과목
    </span>
  </div>
  <div class="flex-center-full gap-2">
    <div class="min-h-px min-w-px grow basis-0 text-[16px] leading-[28px] font-normal text-[#161616]">
      강좌명
    </div>
  </div>
  <div class="w-full text-[16px] leading-[28px] font-semibold text-[#161616]">
    1회차
  </div>
</div>
```

- 왼쪽 margin: `ms-2.5`
- 수업명: 16px / 28px / normal
- 회차: 16px / 28px / semibold

---

## 12. 납부 내역 리스트 컴포넌트

사용 화면: `납부 내역 - 납부완료`

### 12.1 섹션 헤더

```html
<div class="flex items-center border-b border-[rgba(22,22,22,0.96)] pt-[48px] pb-[24px]">
  <p class="flex-1 text-[20px] leading-[32px] font-semibold text-[#161616]">
    납부완료일
  </p>
  ...기간 선택
</div>
```

- 위 padding: `48px`
- 아래 padding: `24px`
- 하단 border: `rgba(22,22,22,0.96)`
- 제목: 20px / 32px / semibold / `#161616`

### 12.2 기간 선택 버튼

```html
<button class="flex items-center gap-[16px] px-[16px] py-[10px] text-[16px] font-normal text-[#161616] leading-[28px]">
  <span class="flex-1 overflow-hidden text-left text-base leading-7 font-normal text-ellipsis whitespace-nowrap">
    2026년
  </span>
</button>
```

- gap: `16px`
- padding: `px-[16px] py-[10px]`
- 텍스트: 16px / 28px / normal
- 텍스트 overflow는 ellipsis 처리

### 12.3 납부 아이템 컨테이너

```html
<div class="flex w-full flex-col py-[24px] border-b border-[rgba(22,22,22,0.08)]">
  <button class="flex w-full flex-col bg-[#FFFFFF] text-left">
    ...
  </button>
</div>
```

- 상하 padding: `24px`
- 하단 border: `rgba(22,22,22,0.08)`
- 내부 버튼 배경: `#FFFFFF`
- 텍스트 정렬: left

### 12.4 납부일 / 상태 라인

```html
<div class="flex w-full items-center pb-[24px]">
  <div class="flex flex-1 items-center gap-[8px]">
    <span class="text-[16px] leading-[28px] font-normal text-[#161616]">
      26.07.01
    </span>
    <span class="flex-1 text-[16px] leading-[28px] font-normal text-[#003ce0]">
      납부완료
    </span>
  </div>
</div>
```

- 날짜: `#161616`
- 상태: `#003ce0`
- gap: `8px`
- 아래 padding: `24px`

### 12.5 분류 라인

```html
<div class="flex w-full items-center gap-[4px] pb-[12px] text-[16px] leading-[28px] font-normal">
  <span class="text-[#161616]">대치단과</span>
  <span class="text-[rgba(22,22,22,0.24)]">/</span>
  <span class="text-[#161616]">교재</span>
</div>
```

- 구분자 `/` 색상: `rgba(22,22,22,0.24)`
- 아래 padding: `12px`

### 12.6 납부 항목명

```html
<p class="w-full overflow-hidden text-[20px] leading-[32px] font-semibold text-ellipsis whitespace-nowrap text-[#161616]">
  납부 항목명
</p>
```

- 20px / 32px / semibold
- 한 줄 ellipsis

### 12.7 금액 라인

```html
<div class="flex w-full items-start gap-[24px] text-[16px] leading-[28px] font-normal text-[#161616]">
  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">총 납부금액</span>
  <span>88,000원</span>
</div>
```

- 좌우 구조: label flex-1, amount 고정
- gap: `24px`
- 텍스트: 16px / 28px / normal

### 12.8 환불완료 같이 보기 버튼

```html
<button class="flex gap-2 cursor-pointer my-5">
  <span class="text-base text-left text-[#161616] font-normal">
    전액 환불완료 같이 보기
  </span>
</button>
```

- margin-y: `my-5`
- gap: `gap-2`
- 텍스트: `text-base`, normal, `#161616`

### 12.9 안내 박스

```html
<div class="pt-[20px] pb-[80px]">
  <div class="flex items-center justify-center gap-[20px] bg-[#f4f4f4] px-[16px] py-[12px]">
    <div class="flex flex-1 flex-col items-start justify-center gap-[8px]">
      <div class="flex items-start gap-[4px] text-[14px] leading-[24px] font-normal text-[rgba(22,22,22,0.5)]">
        <span>*</span>
        <span>취소/환불은 고객센터로 연락해 주세요.</span>
      </div>
    </div>
    <button class="flex items-center text-[14px] leading-[24px] font-normal text-[#002a9e] underline">
      1:1 문의게시판
    </button>
  </div>
</div>
```

- 외부 padding: `pt-[20px] pb-[80px]`
- 박스 배경: `#f4f4f4`
- 박스 padding: `px-[16px] py-[12px]`
- gap: `20px`
- 안내 텍스트: 14px / 24px / normal / `rgba(22,22,22,0.5)`
- 링크 버튼: 14px / 24px / normal / `#002a9e` / underline

---

## 13. Footer

납부내역 화면에서 확인된 푸터 패턴이다.

### 13.1 푸터 컨테이너

```html
<div class="box-border flex w-full flex-col items-start border-t border-[rgba(22,22,22,0.08)]">
  <div class="flex w-full justify-center">
    <div class="flex flex-col items-start gap-20 w-full max-w-[1280px] px-10 py-20">
      ...
    </div>
  </div>
</div>
```

- 상단 border: `rgba(22,22,22,0.08)`
- 내부 최대 폭: `1280px`
- padding: `px-10 py-20`
- 내부 gap: `gap-20`

### 13.2 푸터 링크 그룹

```html
<div class="flex w-full items-center gap-5 text-[14px] leading-[24px] font-semibold text-[rgba(22,22,22,0.7)]">
  <a class="whitespace-pre hover:text-[rgba(22,22,22,0.9)]">이용약관</a>
  <a class="whitespace-pre hover:text-[rgba(22,22,22,0.9)]">개인정보 처리방침</a>
  <a class="whitespace-pre hover:text-[rgba(22,22,22,0.9)]">저작권 침해 신고</a>
</div>
```

- 링크 텍스트: 14px / 24px / semibold
- 기본 색상: `rgba(22,22,22,0.7)`
- hover 색상: `rgba(22,22,22,0.9)`
- gap: `gap-5`

### 13.3 푸터 회사 정보

```html
<p class="text-[14px] leading-[24px] font-normal whitespace-pre text-[rgba(22,22,22,0.5)]">
  회사 정보
</p>
```

- 텍스트: 14px / 24px / normal
- 색상: `rgba(22,22,22,0.5)`
- `whitespace-pre` 사용

---

## 14. 공통 유틸리티/컴포넌트 클래스

### 14.1 중앙 정렬

```css
.flex-center {
  justify-content: center;
  align-items: center;
  display: flex;
}

.flex-center-full {
  justify-content: center;
  align-items: center;
  width: 100%;
  display: flex;
}

.flex-col-center {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  display: flex;
}
```

### 14.2 border divider

```css
.border-divider {
  border-color: #16161614;
}
```

### 14.3 underline

```css
.underline {
  text-underline-offset: 3px;
}
```

---

## 15. 화면별 구조 요약

### 15.1 수업 관리 - 수강 강좌

```txt
App Shell
└─ Header
   └─ 사용자 정보
└─ Main Scroll Area
   ├─ Left Menu
   │  ├─ 수업관리 active
   │  ├─ 출결과제 inactive
   │  └─ 납부내역 inactive
   └─ Right Content
      ├─ Segmented Tabs
      │  ├─ 수강 강좌 active
      │  ├─ 대기 접수 현황 inactive
      │  └─ 추가 대기 신청 inactive
      └─ Class List
         └─ Class Item
            ├─ Subject Badge
            ├─ Class Title
            └─ Detail Link Button
```

### 15.2 출결과제 - 출석 현황

```txt
App Shell
└─ Header
└─ Main Scroll Area
   ├─ Left Menu
   │  ├─ 수업관리 inactive
   │  ├─ 출결과제 active
   │  └─ 납부내역 inactive
   └─ Right Content
      ├─ Segmented Tabs
      │  ├─ 출석 현황 active
      │  └─ 진도/과제 inactive
      ├─ Month Header
      └─ Attendance List
         └─ Attendance Item
            ├─ Date Column: 일자 / 요일 / 출석 상태
            └─ Class Column: 과목 배지 / 수업명 / 회차
```

### 15.3 납부 내역 - 납부완료

```txt
App Shell
└─ Header
└─ Main Scroll Area
   ├─ Left Menu
   │  ├─ 수업관리 inactive
   │  ├─ 출결과제 inactive
   │  └─ 납부내역 active
   └─ Right Content
      ├─ Segmented Tabs
      │  ├─ 납부완료 active
      │  └─ 취소/환불 inactive
      ├─ Section Header
      │  ├─ 납부완료일
      │  └─ Year/Month Select Buttons
      ├─ Payment List
      │  └─ Payment Item
      │     ├─ Date / Status
      │     ├─ Branch / Type
      │     ├─ Item Title
      │     └─ Amount Row
      ├─ Refund Toggle Button
      ├─ Notice Box
      └─ Footer
```

---

## 16. 복제/재현 시 절대 바꾸면 안 되는 부분

1. 좌측 대메뉴 active/inactive의 크기는 동일하게 유지한다. 색상과 underline만 다르다.
2. 하위 탭 active는 흰색, inactive는 `#f4f4f4`이며 inactive 탭에는 `-ml-[1px]`가 적용된다.
3. 전체 레이아웃은 `1280px` 최대 폭과 좌우 `640px` 분할을 기준으로 한다.
4. 텍스트 기본색은 `#161616`이며, 비활성/보조 텍스트는 투명도 있는 `rgba(22,22,22,...)`를 사용한다.
5. 배지는 `rounded-[2px]`, `border-[#c6c6c6]`, `bg-[#f4f4f4]`, `text-[#393939]` 조합을 유지한다.
6. 리스트 구분선은 대부분 `#16161614` 수준의 아주 약한 border를 사용한다.
7. 헤더는 `sticky top-0`, 흰색 배경, `z-index: 50` 구조를 유지한다.
8. 스크롤 영역은 스크롤바를 시각적으로 숨긴다.
9. Pretendard와 font-feature-settings `"ss05" 1, "ss06" 1, "ss10" 1`를 유지한다.
10. 리스트 항목, 탭, 배지, 링크 버튼은 radius와 border를 임의로 키우거나 그림자를 추가하지 않는다.
