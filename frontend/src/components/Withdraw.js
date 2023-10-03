import React from "react";

export function Withdraw({ withdrawTokens, tokenSymbol, caption="Withdraw" }) {
  return (
    <div>
      <form
        onSubmit={(event) => {
          // This function just calls the transferTokens callback with the
          // form's data.
          event.preventDefault();

          const formData = new FormData(event.target);
          const amount = formData.get("amount");

          if (amount) {
            withdrawTokens(amount);
          }
        }}
      >
        <div className="form-group">
          <label>Amount of {tokenSymbol}</label>
          <input
            className="form-control"
            type="number"
            name="amount"
            required
          />
        </div>
        <div className="form-group">
          <input className="btn btn-primary" type="submit" value={caption} />
        </div>
      </form>
    </div>
  );
}
