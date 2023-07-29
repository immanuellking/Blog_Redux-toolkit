import React from 'react'
import { useSelector } from 'react-redux'
import { selectPostIds, getPostsStatus, getPostsError} from './postsSlice'
import PostsExcerpt from './PostsExcerpt'

const PostsList = () => {

    const orderedPostIds = useSelector(selectPostIds);
    const postsStatus = useSelector(getPostsStatus);
    const error = useSelector(getPostsError);

    let content;
    if (postsStatus === "loading") {
        content = <p>"Loading..."</p>
    } else if (postsStatus === "succeeded") {
        content = orderedPostIds.map((postId) => <PostsExcerpt key={postId} postId={postId} />)
    } else if (postsStatus === "failed") {
        content = <p>{error}</p>
    }

  return (
    <section>
        {content}
    </section>
  )
}

export default PostsList