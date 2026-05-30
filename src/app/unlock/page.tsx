type UnlockPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function UnlockPage({ searchParams }: UnlockPageProps) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/";

  return (
    <main className="unlock-shell">
      <section className="unlock-panel">
        <p className="eyebrow">Study With Uta</p>
        <h1>접근 비밀번호</h1>
        <form action="/api/access" method="post">
          <input name="next" type="hidden" value={nextPath} />
          <label>
            Password
            <input autoFocus name="password" type="password" />
          </label>
          {params.error ? <p className="unlock-error">비밀번호가 맞지 않아.</p> : null}
          <button className="primary" type="submit">
            들어가기
          </button>
        </form>
      </section>
    </main>
  );
}
