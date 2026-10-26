// Normal access polling must not replace the reading surface.
// Still discard it when the user's permissions or current post access changes.
export async function checkReadingAccess({before,after,post,readPost}){
 if(['id','role','status'].some(key=>before?.[key]!==after?.[key]))return {action:'redraw'};
 if(!post)return {action:'unchanged'};
 const {data,error}=await readPost(post.id,after?.status!=='approved');
 if(error)throw error;
 if(!data)return {action:'redraw'};
 if(data.updated_at!==post.updated_at||data.visibility!==post.visibility)return {action:'changed',post:data};
 return {action:'unchanged'};
}
