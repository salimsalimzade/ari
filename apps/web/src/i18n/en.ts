// English text. Every other language has the same keys (see Dictionary).

export const en = {
  language: 'Language',
  auth: {
    tagline: 'Every quote you save keeps its source.',
    quoteSource: 'Meadow Quarterly · How Honeybees Choose a New Home',
    or: 'or',
    google: 'Continue with Google',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    errors: {
      emailRequired: 'Enter your email.',
      emailInvalid: 'Enter a valid email address.',
      passwordRequired: 'Enter your password.',
      nameRequired: 'Enter your name.',
      usernameRequired: 'Choose a username.',
      passwordShort: 'Use at least 8 characters.',
      passwordLong: 'That password is too long.',
      ageRequired: 'Enter your age.',
      termsRequired: 'Agree to the terms to create an account.',
    },
    login: {
      pageTitle: 'Log in · Ari',
      title: 'Log in to Ari',
      quote:
        'No single bee compares all of the options. The choice emerges from many scouts, each advertising one site.',
      passwordPlaceholder: 'Your password',
      forgotPassword: 'Forgot password?',
      submit: 'Log in',
      newToAri: 'New to Ari?',
      createAccount: 'Create an account',
    },
    register: {
      pageTitle: 'Create your account · Ari',
      title: 'Create your account',
      quote:
        'Scouts prefer a cavity of about 40 litres, with a small entrance placed high above the ground.',
      name: 'Full name',
      namePlaceholder: 'Your name',
      username: 'Username',
      usernamePlaceholder: 'johndoe',
      passwordPlaceholder: 'Create a password',
      passwordHint: 'At least 8 characters',
      age: 'Age',
      terms: 'I agree to Ari’s Terms of Service and Privacy Policy.',
      submit: 'Create account',
      haveAccount: 'Already have an account?',
      logIn: 'Log in',
    },
  },
};

export type Dictionary = typeof en;
