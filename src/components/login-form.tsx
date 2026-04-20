export function LoginForm() {
  return (
    <form action="/api/auth/login" className="form-stack" method="post">
      <label className="field">
        <span>Login</span>
        <input autoComplete="username" name="login" />
      </label>
      <label className="field">
        <span>Password</span>
        <input autoComplete="current-password" name="password" type="password" />
      </label>
      <button className="button" type="submit">
        Sign In
      </button>
    </form>
  );
}
