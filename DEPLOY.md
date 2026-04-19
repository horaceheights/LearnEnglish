# Deploy Learn English

This app is set up to deploy with:

- Frontend: Vercel
- Backend API: Koyeb

The frontend and backend should be deployed as two separate projects from the same GitHub repository.

## 1. Push The Repo To GitHub

Push this whole repository to GitHub first. Both Vercel and Koyeb can deploy directly from the same repo.

## 2. Deploy The Backend On Koyeb

Official references:

- Koyeb FastAPI guide: https://www.koyeb.com/docs/deploy/fastapi
- Koyeb Python runtime selection: https://www.koyeb.com/docs/build-and-deploy/build-from-git/python

In Koyeb:

1. Create a new `Web Service`.
2. Choose `GitHub` as the source.
3. Select this repository.
4. Set the service root directory to `backend`.
5. Use the default `Buildpack` builder.
6. Set the run command to:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

7. Add this environment variable after you know your Vercel frontend URL:

```text
ALLOWED_ORIGINS=https://your-project-name.vercel.app
```

After deploy, Koyeb will give you a URL like:

```text
https://your-api-name.koyeb.app
```

Test these endpoints:

- `https://your-api-name.koyeb.app/api/health`
- `https://your-api-name.koyeb.app/api/lessons`

## 3. Deploy The Frontend On Vercel

Official references:

- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Vercel environment variables: https://vercel.com/docs/environment-variables

In Vercel:

1. Create a new project from GitHub.
2. Select this repository.
3. Set the root directory to `frontend`.
4. Add this environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-api-name.koyeb.app
```

5. Deploy.

Vercel will give you a URL like:

```text
https://your-project-name.vercel.app
```

## 4. Update CORS On Koyeb

After Vercel gives you the final frontend URL, go back to Koyeb and set:

```text
ALLOWED_ORIGINS=https://your-project-name.vercel.app
```

If you want both local dev and Vercel allowed, use:

```text
ALLOWED_ORIGINS=http://localhost:3000,https://your-project-name.vercel.app
```

Redeploy the Koyeb service after changing environment variables.

## 5. About Mobile Speech

Speech recognition on phones often requires a secure origin. Once the app is deployed on:

- `https://...vercel.app`
- `https://...koyeb.app`

mobile microphone access has a much better chance of working than it does on a home-network HTTP URL.
