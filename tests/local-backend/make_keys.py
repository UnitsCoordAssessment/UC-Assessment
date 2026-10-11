"""Makes local stand-ins for Supabase's anon and service_role keys (HS256 JWTs)."""
import base64, hashlib, hmac, json, sys, time

SECRET = sys.argv[1]

def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def jwt(payload: dict) -> str:
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64(json.dumps(payload).encode())
    sig = hmac.new(SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{b64(sig)}"

exp = int(time.time()) + 24 * 3600
print(json.dumps({"anon": jwt({"role": "anon", "exp": exp}),
                  "service_role": jwt({"role": "service_role", "exp": exp})}))
