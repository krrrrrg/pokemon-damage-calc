/**
 * 정적 데이터 기반 supabase 호환 클라이언트.
 * 기존 Supabase 대신 public/data/*.json 을 읽어 동일한 쿼리 API를 제공한다.
 * (Supabase 키/네트워크 불필요 — 검색·계산이 정적 데이터로 동작)
 *
 * 지원: from().select().eq().neq().or().ilike().in().order().limit() + await → { data, error }
 */

const cache = new Map<string, Promise<any[]>>();

function loadTable(table: string): Promise<any[]> {
  // 서버 렌더 단계에서는 빈 배열 (실제 쿼리는 모두 클라이언트 useEffect에서 실행됨)
  if (typeof window === "undefined") return Promise.resolve([]);
  if (!cache.has(table)) {
    const p = fetch(`/data/${table}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    cache.set(table, p);
  }
  return cache.get(table)!;
}

function ilikeToRegex(pattern: string): RegExp {
  // %foo% → 부분일치, 대소문자 무시
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
  return new RegExp("^" + escaped + "$", "i");
}

// "name_kr.ilike.%foo%" 형태 단일 조건 파서
function matchCondition(row: any, cond: string): boolean {
  const first = cond.indexOf(".");
  const second = cond.indexOf(".", first + 1);
  if (first === -1 || second === -1) return false;
  const col = cond.slice(0, first);
  const op = cond.slice(first + 1, second);
  const val = cond.slice(second + 1);
  const cell = row[col];
  switch (op) {
    case "ilike":
      return cell != null && ilikeToRegex(val).test(String(cell));
    case "like":
      return cell != null && new RegExp("^" + val.replace(/%/g, ".*") + "$").test(String(cell));
    case "eq":
      return String(cell) === val;
    case "neq":
      return String(cell) !== val;
    default:
      return false;
  }
}

function compare(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "ko");
}

interface OrderSpec {
  col: string;
  asc: boolean;
}

class StaticQuery implements PromiseLike<{ data: any[] | null; error: null }> {
  private filters: ((row: any) => boolean)[] = [];
  private orderSpec: OrderSpec | null = null;
  private limitN: number | null = null;

  constructor(private table: string) {}

  select(_cols = "*") {
    // 컬럼 프로젝션은 무시(전체 반환). 상위 코드가 필요한 필드만 읽으므로 무해.
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push((r) => r[col] === val || String(r[col]) === String(val));
    return this;
  }
  neq(col: string, val: any) {
    this.filters.push((r) => !(r[col] === val || String(r[col]) === String(val)));
    return this;
  }
  ilike(col: string, pattern: string) {
    const re = ilikeToRegex(pattern);
    this.filters.push((r) => r[col] != null && re.test(String(r[col])));
    return this;
  }
  like(col: string, pattern: string) {
    const re = new RegExp("^" + pattern.replace(/%/g, ".*") + "$");
    this.filters.push((r) => r[col] != null && re.test(String(r[col])));
    return this;
  }
  in(col: string, vals: any[]) {
    const set = new Set(vals.map((v) => String(v)));
    this.filters.push((r) => set.has(String(r[col])));
    return this;
  }
  or(conditions: string) {
    const parts = conditions.split(",");
    this.filters.push((r) => parts.some((c) => matchCondition(r, c.trim())));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderSpec = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private async run(): Promise<{ data: any[] | null; error: null }> {
    let rows = await loadTable(this.table);
    if (this.filters.length) rows = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.orderSpec) {
      const { col, asc } = this.orderSpec;
      rows = [...rows].sort((a, b) => (asc ? compare(a[col], b[col]) : -compare(a[col], b[col])));
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return { data: rows, error: null };
  }

  then<TResult1 = { data: any[] | null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any[] | null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export const supabase = {
  from(table: string) {
    return new StaticQuery(table);
  },
};
