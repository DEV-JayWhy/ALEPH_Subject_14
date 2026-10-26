const conflictMessage='다른 창에서 수정·게시·삭제되었거나 권한이 변경되었습니다. 내용을 복사해 둔 뒤 임시저장 목록을 확인해 주세요.';
export async function storeWriting({db,id,authorId,previous,values,publish}){
 if(!publish&&previous?.is_published){const error=new Error('published post cannot become a draft');error.publicMessage='이미 게시된 글은 수정 내용 저장을 이용해 주세요.';throw error;}
 if(publish&&!values.title.trim()){const error=new Error('title required');error.publicMessage='제목을 입력해 주세요.';throw error;}
 const payload={title:values.title.trim()||'제목 없는 임시저장',excerpt:values.excerpt,content_html:values.content_html,category:values.category||null,visibility:values.visibility,is_published:publish};
 if(publish&&previous&&!previous.is_published)payload.created_at=new Date().toISOString();
 const query=previous?db.from('posts').update({...payload,updated_at:new Date().toISOString()}).eq('id',id).eq('updated_at',previous.updated_at).eq('is_published',previous.is_published):db.from('posts').insert({...payload,id,author_id:authorId});
 const {data,error}=await query.select('*').maybeSingle();
 if(error)throw error;
 if(!data){const error=new Error('writing conflict');error.publicMessage=conflictMessage;throw error;}
 return data;
}

export async function deleteStoredDraft({db,id,updatedAt}){
 const {data,error}=await db.from('posts').delete().eq('id',id).eq('is_published',false).eq('updated_at',updatedAt).select('id').maybeSingle();
 if(error)throw error;
 if(!data){const error=new Error('draft delete conflict');error.publicMessage=conflictMessage;throw error;}
 return data;
}
