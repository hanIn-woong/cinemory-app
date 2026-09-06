/**
 * 경로 문자열의 단일 출처. 화면·훅에 리터럴 경로가 등장하면 안 된다.
 * (docs/M2-frontend-spec.md §5, docs/M2A-foundation-spec.md §4.3)
 */
export const EP = {
  auth: {
    signup: '/api/auth/signup',
    login: '/api/auth/login',
    nonce: '/api/auth/nonce',
    oauth: (provider: string) => `/api/auth/oauth/${provider}`,
    reissue: '/api/auth/reissue',
    logout: '/api/auth/logout',
    passwordResetRequest: '/api/auth/password-reset/request',
    passwordResetVerify: '/api/auth/password-reset/verify',
    passwordResetConfirm: '/api/auth/password-reset/confirm',
  },
  movies: {
    list: '/api/movies',
    search: '/api/movies/search',
    random: '/api/movies/random',
    detail: (movieId: number) => `/api/movies/${movieId}`,
    cast: (movieId: number) => `/api/movies/${movieId}/cast`,
    sync: '/api/movies/sync',
    wish: (movieId: number) => `/api/movies/${movieId}/wish`,
    review: (movieId: number) => `/api/movies/${movieId}/review`,
    reviews: (movieId: number) => `/api/movies/${movieId}/reviews`,
  },
  records: {
    create: '/api/records',
    byId: (recordId: number) => `/api/records/${recordId}`,
    representative: (recordId: number) => `/api/records/${recordId}/representative`,
    ofUser: (userId: number) => `/api/users/${userId}/records`,
    ofUserMovie: (userId: number, movieId: number) => `/api/users/${userId}/records/movies/${movieId}`,
  },
  reviews: {
    me: '/api/reviews/me',
  },
  wishes: {
    ofUser: (userId: number) => `/api/users/${userId}/wishes`,
    me: (movieId: number) => `/api/wishes/me/${movieId}`,
  },
  collections: {
    ofUser: (userId: number) => `/api/users/${userId}/collections`,
    movies: (collectionId: number) => `/api/collections/${collectionId}/movies`,
    create: '/api/collections',
    update: (collectionId: number) => `/api/collections/${collectionId}`,
    remove: (collectionId: number) => `/api/collections/${collectionId}`,
    removeMovie: (collectionId: number, movieId: number) => `/api/collections/${collectionId}/movies/${movieId}`,
  },
  users: {
    me: '/api/users/me',
    profile: (userId: number) => `/api/users/${userId}/profile`,
    nickname: '/api/users/me/nickname',
    privacy: '/api/users/me/privacy',
    password: '/api/users/me/password',
    follow: (userId: number) => `/api/users/${userId}/follow`,
    followers: (userId: number) => `/api/users/${userId}/followers`,
    followings: (userId: number) => `/api/users/${userId}/followings`,
  },
  comments: {
    list: '/api/comments',
    create: '/api/comments',
    update: (commentId: number) => `/api/comments/${commentId}`,
    remove: (commentId: number) => `/api/comments/${commentId}`,
  },
  theaters: {
    nearby: '/api/theaters/nearby',
  },
  boxOffice: {
    root: '/api/box-office',
  },
} as const;
