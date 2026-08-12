import { TWO_FACTOR_FROM } from "./email-2fa";

if (TWO_FACTOR_FROM.includes("noreply") || TWO_FACTOR_FROM.includes("no-reply")) {
  throw new Error("2FA sender must not use a no-reply alias");
}
if (TWO_FACTOR_FROM !== "TAP Hub <security@email.mom-ai-agency.site>") {
  throw new Error(`Unexpected 2FA sender: ${TWO_FACTOR_FROM}`);
}
console.log("email-2fa-sender-regression=PASS");
