export interface IUser {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  role?: string;
  createdAt?: Date;
}

export interface IUserListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string; // রাস্তা
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string; // "8502 Preston Rd., Inglewood, Maine 98380"
}

export interface IUserListResponse {
  items: IUserListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
}