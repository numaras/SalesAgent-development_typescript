/**
 * Public signup onboarding. Parity with _legacy public.signup_onboarding:
 * GET /signup/onboarding (requires signup_flow + user in session).
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";

import { getAdminSession } from "../../services/sessionService.js";

function getScriptRoot(request: FastifyRequest): string {
  const r = request as FastifyRequest & { scriptRoot?: string };
  return r.scriptRoot ?? "";
}

const onboardingRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/signup/onboarding", async (request, reply) => {
    const root = getScriptRoot(request);
    const session = getAdminSession(request);

    if (!session.signup_flow) {
      return reply.redirect(`${root}/signup`, 302);
    }

    if (!session.user) {
      return reply.redirect(`${root}/signup/start`, 302);
    }

    const userEmail = session.user;
    const userName = (session.user_name as string) ?? "";

    return reply.send({
      page: "onboarding",
      user_email: userEmail,
      user_name: userName,
    });
  });
};

export default onboardingRoute;
