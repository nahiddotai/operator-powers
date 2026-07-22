# Marketplace readiness

Prepared against the current public requirements on 2026-07-22. Requirements can change and must be rechecked immediately before submission.

## OpenAI directory

Prepared locally:

- With-MCP package structure and version `1.0.0`.
- Listing fields within final-submission limits, including support URL.
- Exactly five positive and three negative reviewer tests.
- MCP annotation values and paste-ready reasons for every tool.
- Domain challenge route at `/.well-known/openai-apps-challenge`.
- Release notes and reviewer demo script.
- Skill safety descriptions, routing contracts, source ledger, privacy, terms, support, and security documentation.

Account or production actions still required:

1. Verify the publisher identity and confirm Apps Management write permission.
2. Create a With MCP submission and obtain the domain-verification token.
3. Set `OPENAI_APPS_CHALLENGE` on the production Worker, deploy that configuration, and click Verify Domain.
4. Run the portal's current MCP tool scan.
5. Paste the annotation reasons and the five positive and three negative cases.
6. Record and upload the reviewer demo using synthetic data.
7. Complete policy attestations, select supported countries, submit for review, and publish only after approval.

## Anthropic directory

Prepared locally:

- Twenty-eight focused skills with names under 64 characters and descriptions at or under 200 characters.
- Clear use conditions, narrow job contracts, collision rules, and three reviewer examples.
- Public documentation, privacy, terms, security, support, troubleshooting, source provenance, and MCP annotations.

Confirmed policy conflict:

Anthropic's Software Directory Policy dated 2026-04-15 says directory software must not query or extract Claude memory, chat history, conversation summaries, or user-generated or uploaded files. Operator Audit intentionally reads local Claude or Codex history only after a separate explicit confirmation. Consent improves user safety but does not remove the written directory-policy conflict. The full plugin has been preserved as requested, so Anthropic acceptance cannot be represented as assured.

Account actions still required:

1. Confirm the current submission form and publisher account access.
2. Provide verified contact and support information.
3. Provide the repository, three examples, troubleshooting, and any reviewer test account or sample data requested.
4. Submit the complete plugin and answer the Operator Audit data-access question accurately.

No submission, deployment, domain-token change, or publication is performed by this repository preparation alone.
