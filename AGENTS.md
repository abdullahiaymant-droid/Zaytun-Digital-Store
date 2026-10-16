<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Order placement goes through the `place_order` database function, never client-computed totals — prices, stock and coupons must be validated server-side.
- First account to sign up is auto-granted admin via the signup trigger; roles live only in `user_roles`.
- Cart lives in localStorage (guest-friendly); everything else (orders, wishlist, reviews) is in the database.
- Staff permissions come from `has_perm(uid, perm)` in the database (role → permission map lives there); RLS and admin RPCs check it, the UI only hides controls.
- Order status/payment history, stock history, audit logs and admin notifications are written by database triggers, so every path (UI or not) is recorded.
