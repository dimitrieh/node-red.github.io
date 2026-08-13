---
title: "Slack"
layout: "about-single"
---


To get an invite to the Node-RED Slack, enter your email below.

Make sure you've read our [guidelines](/about/community) first.

<div class="slack">
    <div class="slackform">
        <p><input id="e" placeholder="Email"> <input type="submit" id="go" value="Get invite"></p>
        <p class="slackerr"></p>
    </div>
    <div class='slackmsg hide'>
        <p>Check your email for an invitation</p>
    </div>
</div>

Already a member? <a href="https://node-red.slack.com">Click here</a> to join the conversation

<script>
    // Vanilla replacement for the Jekyll-era jQuery handler — the new Astro
    // stack does not load jQuery globally. Same Lambda endpoint as before.
    (function () {
        const ERRORS = {
            invalid_email: 'Not a valid email address',
            already_invited: 'Email address already invited',
            already_in_team: 'Email address already in the team',
        };
        const btn = document.getElementById('go');
        const email = document.getElementById('e');
        const errEl = document.querySelector('.slackerr');
        const msgEl = document.querySelector('.slackmsg');
        if (!btn || !email || !errEl || !msgEl) return;
        btn.addEventListener('click', async function () {
            errEl.textContent = '';
            btn.setAttribute('disabled', 'true');
            try {
                const body = new URLSearchParams({ email: email.value });
                const res = await fetch(
                    'https://gnh34zyze1.execute-api.eu-west-2.amazonaws.com/default/nodeREDSlackInviter',
                    { method: 'POST', body }
                );
                const data = await res.json();
                btn.removeAttribute('disabled');
                if (!data.ok) {
                    errEl.textContent = ERRORS[data.error] || ('Something unexpected happened: ' + data.error);
                } else {
                    email.value = '';
                    msgEl.classList.remove('hide');
                    msgEl.style.display = '';
                }
            } catch (err) {
                btn.removeAttribute('disabled');
                errEl.textContent = 'Could not reach the invite service. Please try again later.';
            }
        });
    })();
</script>

<style>
    .slack input {
        border: 1px solid #999;
        background: #fff;
        color: #666;
        padding: 8px 16px;
        font-size: 20px;
    }
    .slack #e {
        width: 370px;
    }
    .slack #go {
        cursor: pointer;
    }
    .slackerr {
        margin-top: 0;
        font-size: 16px;
        color: #f66;
    }

</style>
