/**
 * このファイルを読む前に（読む順番 8-5）
 *
 * 役割: 環境変数からOAuth設定を読み込み、URLと宛先の整合性を検査する。
 * 前: create-auth-handlers.tsが初回に設定を解決し、失敗した場合は503へ変換する。
 * 次: apps/web/src/mcp-app/host/work-report-host.tsで、結果を受け取るUI側へ進む。
 * 理解したいこと: issuerは発行者、audienceはTokenの宛先、resourceUrlは守るMCPのURL。
 * 設定は検証関数とMetadataの共通の元になり、ここではToken検証やログインを行わない。
 */
export type WorkReportOAuthConfig = {
  issuer: string;
  audience: string;
  resourceUrl: string;
  jwksUri: string;
  resourceMetadataUrl: string;
};

// 設定の実値を例外へ入れず、呼び出し元に「設定を使えない」とだけ伝える。
export class OAuthConfigurationError extends Error {
  constructor() {
    super("OAuth configuration is unavailable");
    this.name = "OAuthConfigurationError";
  }
}

type RequiredOAuthEnvKey =
  "WORK_REPORT_AUTH_ISSUER" | "WORK_REPORT_AUTH_AUDIENCE" | "WORK_REPORT_MCP_RESOURCE_URL";

const readRequiredEnv = (env: NodeJS.ProcessEnv, key: RequiredOAuthEnvKey): string => {
  const value = env[key]?.trim();
  if (!value) throw new OAuthConfigurationError();
  return value;
};

// 設定URLはHTTPS必須で、URL中の認証情報やfragmentも拒否する。
// issuer/resource固有のpath・query条件は、後続の正規化関数で追加検査する。
const requireHttpsUrl = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OAuthConfigurationError();
  }

  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new OAuthConfigurationError();
  }

  return url;
};

// 発行者URLの末尾を/へ統一する。JWTのissuer検証とJWKS URLの組立に同じ値を使う。
const normalizeIssuer = (value: string): string => {
  const url = requireHttpsUrl(value);
  if (url.search) throw new OAuthConfigurationError();
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
  return url.toString();
};

// このアプリが保護するEndpointは/mcp。別pathの設定を受け入れない。
const normalizeResourceUrl = (value: string): string => {
  const url = requireHttpsUrl(value);
  if (url.search) throw new OAuthConfigurationError();
  if (url.pathname !== "/mcp") throw new OAuthConfigurationError();
  return url.toString();
};

/**
 * 必須設定の欠落や不整合は例外にし、resolver側で利用不可として扱う。
 * envを引数にも取れるため、テストでは実際の環境設定を変更せず条件を確認できる。
 */
export const loadWorkReportOAuthConfig = (
  env: NodeJS.ProcessEnv = process.env,
): WorkReportOAuthConfig => {
  const issuer = normalizeIssuer(readRequiredEnv(env, "WORK_REPORT_AUTH_ISSUER"));
  const resourceUrl = normalizeResourceUrl(readRequiredEnv(env, "WORK_REPORT_MCP_RESOURCE_URL"));
  const audience = readRequiredEnv(env, "WORK_REPORT_AUTH_AUDIENCE");

  // この実装ではaudienceをMCPの公開URLと同一にする。他API宛ての設定混入を防ぐ。
  if (audience !== resourceUrl) throw new OAuthConfigurationError();

  // JWKSの明示設定がなければissuer配下から導出する。鍵の取得自体はverifierの担当。
  const configuredJwksUri = env.WORK_REPORT_AUTH_JWKS_URI?.trim();
  const jwksUri = configuredJwksUri
    ? requireHttpsUrl(configuredJwksUri).toString()
    : new URL(".well-known/jwks.json", issuer).toString();

  const resource = new URL(resourceUrl);
  const resourceMetadataUrl = new URL(
    "/.well-known/oauth-protected-resource/mcp",
    resource.origin,
  ).toString();

  return { issuer, audience, resourceUrl, jwksUri, resourceMetadataUrl };
};
