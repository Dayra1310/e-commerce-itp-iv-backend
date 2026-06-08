export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export interface UserWithoutPassword {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}
