export interface IUser {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserListItem {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
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

// edit-এর সময় যেগুলো পাঠানো যাবে (সবগুলো ঐচ্ছিক)
export interface IUpdateUserInput {
  firstName?: string;
  lastName?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
}

// edit-এর সময় যেগুলো পাঠানো যাবে (সবগুলো ঐচ্ছিক)
export interface IUpdateUserInput {
  firstName?: string;
  lastName?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
}

// edit-এর পর যে user ফেরত যাবে
export interface IUpdatedUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
}

export interface IStaffListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface IStaffListResponse {
  items: IStaffListItem[];
  meta: IUserListResponse["meta"];
}

export interface ICreateStaffInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}