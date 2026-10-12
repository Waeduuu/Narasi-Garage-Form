# Narasi Garage Recruitment — Discord Delivery

The GitHub Pages form is PUBLIC. Never add the Discord webhook URL to the page, frontend config, Worker source or README.

## One-time setup (Cloudflare Workers)

1. Create a Cloudflare Worker and paste the contents of discord-proxy/worker.js, then deploy it.
2. Under Worker Settings > Variables and Secrets, create a SECRET named DISCORD_WEBHOOK_URL. Paste the Discord Recruitment webhook URL there, using an encrypted secret.
3. Copy the Worker URL, for example https://your-worker.your-account.workers.dev
4. Edit recruitment-config.js in this GitHub repo to:
   window.NARASI_RECRUITMENT_ENDPOINT = 'https://your-worker.your-account.workers.dev';
5. Commit the ONE-LINE public endpoint change. Reload the recruitment website.
6. Submit one test Supervisor or Mechanic application and verify the Discord log.

## Notes

- The user-provided webhook is NOT stored in this repository.
- GitHub Pages alone cannot securely store secrets or run a backend.
- The Discord submission button is disabled until an endpoint is configured. Copy and TXT export still work.
- Supervisor logs use cyan, 16 questions. Mechanic logs use gold, 14 questions plus 3 applicant fields.
- Long answers are split across sequential Discord messages without truncating completed answers.
- Allowed mentions are disabled to avoid unwanted pings.
- The Worker checks CORS Origin but Origin alone does not authenticate a user or stop spam. Enable Cloudflare rate limiting, CAPTCHA / Turnstile and monitoring before public launch.
- The Worker never returns the Discord webhook URL.
- If delivery fails partway through a multi-message submission, messages may already exist. Check the channel before retrying.
