(() => {
    const form = document.querySelector(".newsletterForm");
    const note = document.querySelector(".newsletterNote");
    if (!form || !note) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = form.querySelector("button[type='submit']");
        const data = new FormData(form);
        const email = String(data.get("email") || "").trim();
        const turnstileToken = String(data.get("cf-turnstile-response") || "");

        if (!turnstileToken) {
            note.textContent = "Please complete the quick security check.";
            note.classList.remove("is-submitted");
            return;
        }

        button.disabled = true;
        button.textContent = "Sending...";
        note.textContent = "Setting up your review alerts...";

        try {
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, turnstileToken })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Signup could not be completed.");

            form.reset();
            window.turnstile?.reset();
            note.textContent = "Almost there - check your inbox and confirm your subscription.";
            note.classList.add("is-submitted");
        } catch (error) {
            note.textContent = error.message || "Something went wrong. Please try again.";
            note.classList.remove("is-submitted");
            window.turnstile?.reset();
        } finally {
            button.disabled = false;
            button.textContent = "Notify Me";
        }
    });
})();
