export type AuthSession = { 
    access_token: string;
    refresh_token: string;
    access_token_expired_at: number;
    id_token: string;
    id_token_expired_at: number;
    username: string;
}