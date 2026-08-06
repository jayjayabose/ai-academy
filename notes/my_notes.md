i might have navigated around some of the planned gotchas via /grill me during infastructure setup

# Fetch latest from upstream (pull from shared repo)
git fetch upstream

# Rebase your work on top of upstream changes
git rebase upstream/main

# Push to your personal repo (push to your copy)
git push origin main

# Serena
https://oraios.github.io/serena/02-usage/030_clients.html#claude-code
claude --system-prompt="$(serena prompts print-cc-system-prompt-override)"

project workflow
https://oraios.github.io/serena/02-usage/040_workflow.html

configuration
https://oraios.github.io/serena/02-usage/050_configuration.html

I sort of cheated in a sense. I asked claude about how to approach the work: "what do you think of building a front end and stubbing backend to get started" and it responded by telling me what the course materials say on this very point.

Because I had setup my project with shared types, I took an approach of designing FE screens, figuring out what that means for data model, API end pointa and data types. Then tried to do front and back ends in parallel.  I skipped dual track database migrations because we had setup so as to avoid the problem that it solved.

I am havign a lot of detailed discussions where my understanding is 75%.

I have asked some questions that revised it's approach: e.g. "from a REST standpoint are interactions as trud subresource"; "is it conventional for db:seed to be destructive?"
