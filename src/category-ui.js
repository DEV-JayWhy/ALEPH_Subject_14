export const categoryIcons=[['notebook','노트'],['network','네트워크'],['shield','보안'],['code','개발'],['terminal','터미널'],['cloud','클라우드'],['book','책'],['science','실험'],['database','데이터베이스'],['folder','폴더'],['idea','아이디어'],['globe','지구']];
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function categoryNameIssue(value){const name=typeof value==='string'?value.trim():'';if(!name||[...name].length>30)return '카테고리 이름은 1~30자로 입력해 주세요.';if(['전체','미분류','임시저장'].includes(name)||/[\x00-\x1f\x7f]/.test(name))return '전체·미분류·임시저장과 제어 문자는 카테고리 이름으로 사용할 수 없습니다.';return null;}
export function categoryVisual(value){
 const [kind,key,...extra]=String(value).split(':');if(extra.length)throw Error('invalid category image');
 if(kind==='builtin'&&categoryIcons.some(([id])=>id===key))return {icon_key:key,image_id:null};
 if(kind==='upload'&&uuid.test(key))return {icon_key:'notebook',image_id:key};
 throw Error('invalid category image');
}
export function categoryImageHtml(category,escape){const key=categoryIcons.some(([id])=>id===category?.icon_key)?category.icon_key:'notebook';return `<img class="category-image" src="/category-icons/${key}.svg" ${category?.image_id&&uuid.test(category.image_id)?`data-category-image="${escape(category.image_id)}"`:''} alt="" loading="lazy">`;}
export function categoryLabel(name){return name||'미분류';}
