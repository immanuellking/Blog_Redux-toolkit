import {
  createSlice,
  nanoid,
  createAsyncThunk,
  createSelector,
  createEntityAdapter,
} from "@reduxjs/toolkit";
import { sub } from "date-fns";
import axios from "axios";

const POSTS_URL = "https://jsonplaceholder.typicode.com/posts";

const postsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.date.localeCompare(a.date),
});

const initialState = postsAdapter.getInitialState({
  // our initial state will already return that normalized object, where theres an array of item ids and entities object that has all the items, the rest arer the extra state we add
  status: "idle", //"idle" | "loading" | "succeeded" | "failed"
  error: null,
  count: 0,
});

// const initialState = {
//     posts: [],
//     status: "idle", //"idle" | "loading" | "succeeded" | "failed"
//   error: null,
//   count: 0,
// }

export const fetchPosts = createAsyncThunk("posts/fetchPosts", async () => {
  const response = await axios.get(POSTS_URL);
  return response.data;
});

export const addNewPost = createAsyncThunk(
  "posts/addNewPost",
  async (initialPost) => {
    const response = await axios.post(POSTS_URL, initialPost);
    return response.data;
  }
);

export const updatePost = createAsyncThunk(
  "posts/updatePost",
  async (initialPost) => {
    try {
      const { id } = initialPost;
      const response = await axios.put(`${POSTS_URL}/${id}`, initialPost);
      return response.data;
    } catch (error) {
      return initialPost;
    }
  }
);

export const deletePost = createAsyncThunk(
  "posts/deletePost",
  async (initialPost) => {
    const { id } = initialPost;
    try {
      const response = await axios.delete(`${POSTS_URL}/${id}`);
      if (response?.status === 200) return initialPost;
      return `${response?.status}: ${response?.statusText}`;
    } catch (err) {
      return err.message;
    }
  }
);

const postSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    postAdded: {
      reducer(state, action) {
        state.posts.push(action.payload);
      },
      prepare(title, content, userId) {
        return {
          payload: {
            id: nanoid(),
            title,
            content,
            date: new Date().toISOString(),
            userId,
            reactions: {
              thumbsUp: 0,
              wow: 0,
              heart: 0,
              rocket: 0,
              coffee: 0,
            },
          },
        };
      },
    },
    reactionAdded(state, action) {
      const { postId, reaction } = action.payload;
      //   const existingPost = state.posts.find((post) => post.id === postId);
      const existingPost = state.entities[postId]; //select a particualr postusing the entities property
      if (existingPost) {
        existingPost.reactions[reaction]++;
      }
    },
    increaseCount(state, action) {
      state.count = state.count + 1;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchPosts.pending, (state, action) => {
        state.status = "succeeded";
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        console.log(action.payload);
        state.status = "succeeded";
        let min = 1;
        const loadedPosts = action.payload.map((post) => {
          post.date = sub(new Date(), { minutes: min++ }).toISOString();
          post.reactions = {
            thumbsUp: 0,
            wow: 0,
            heart: 0,
            rocket: 0,
            coffee: 0,
          };
          return post;
        });
        // state.posts = loadedPosts;
        postsAdapter.upsertMany(state, loadedPosts); //set the loaded posts from the api into the posts adapter
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addNewPost.fulfilled, (state, action) => {
        action.payload.userId = Number(action.payload.userId);
        action.payload.date = new Date().toISOString();
        action.payload.reactions = {
          thumbsUp: 0,
          wow: 0,
          heart: 0,
          rocket: 0,
          coffee: 0,
        };
        console.log(action.payload);
        // state.posts.push(action.payload);
        postsAdapter.addOne(state, action.payload); // to add an individual post
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        if (!action.payload?.id) {
          console.log("Update could not complete");
          console.log(action.payload);
          return;
        }
        // const { id } = action.payload;
        action.payload.date = new Date().toISOString();
        // const posts = state.posts.filter((post) => post.id !== id);
        // state.posts = [...posts, action.payload];
        postsAdapter.upsertOne(state, action.payload) //to update a specific a post
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        if (!action.payload?.id) {
          console.log("Delete could not complete");
          console.log(action.payload);
          return;
        }
        const { id } = action.payload;
        // const posts = state.posts.filter((post) => post.id !== id);
        // state.posts = posts;
        postsAdapter.removeOne(state, id) //to delete a specific post
      });
  },
});

// export const selectAllPosts = (state) => state.posts.posts;
export const { //getSelctors creates these selectors and we rename them with aliases useing destructuring
    selectAll: selectAllPosts,
    selectById: selectPostById,
    selectIds: selectPostIds,
    //pass in a selector that returns the posts slice of state
} = postsAdapter.getSelectors(state => state.posts)



export const getPostsStatus = (state) => state.posts.status;
export const getPostsError = (state) => state.posts.error;
export const getCount = (state) => state.posts.count;

// export const selectPostById = (state, postId) =>
//   state.posts.posts.find((post) => post.id === postId);

export const selectPostsByUser = createSelector(
  //This is a memoized selector "createSelector", this accepts one or input functions that are inside brackets like array, which makes them dependencies
  [selectAllPosts, (state, userId) => userId], //the values returned from this functions are the dependencies and the provide the input parameters for the output function for our memoized selector

  (posts, userId) => posts.filter((post) => post.userId === userId)
);

export const { postAdded, reactionAdded, increaseCount } = postSlice.actions;

export default postSlice.reducer;
