export interface User {
  id: number;
  name: string | null;
  email: string;
}

export interface Post {
  id: number;
  title: string;
  content: string | null;
  published: boolean;
  authorId: number;
}

export interface PostWithAuthor extends Post {
  author: User;
}
