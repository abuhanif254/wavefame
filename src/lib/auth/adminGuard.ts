/**
 * Server-Side Admin Authentication Guard
 * Protects all /api/admin/* endpoints from unauthorized public invocations.
 */

export function verifyAdminRequest(req: Request): { authorized: boolean; error?: string } {
  const secretKey = process.env.ADMIN_SECRET_KEY || "waveframe_secret_key_prod_2026";

  const xAdminKey = req.headers.get("x-admin-key")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();

  let bearerToken = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.substring(7).trim();
  }

  const tokenProvided = xAdminKey || bearerToken;

  if (!tokenProvided) {
    return { authorized: false, error: "Missing admin secret key in request headers." };
  }

  if (tokenProvided !== secretKey) {
    return { authorized: false, error: "Invalid admin secret key. Access denied." };
  }

  return { authorized: true };
}
