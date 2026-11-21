import { z } from 'zod'
import { venueSchema, photoSchema } from './data'
const image = z.object({id:z.string(),url:z.string(),width:z.number(),height:z.number(),kind:z.literal('illustration'),authorId:z.string(),license:z.literal('CC0-1.0'),alt:z.string()})
const outputVenue = venueSchema.omit({photos:true}).extend({photos:z.array(photoSchema.omit({path:true}).extend({url:z.url()})),illustration:image})
const venue = z.toJSONSchema(outputVenue,{target:'openapi-3.0'})
const response = (schema: unknown, description = 'Success') => ({description,content:{'application/json':{schema}}})
const ref = (name: string) => ({$ref:`#/components/schemas/${name}`})
const error = response(ref('Error'),'Invalid parameter')
const pathId = {name:'id',in:'path',required:true,schema:{type:'string'}}
const pretty = {name:'pretty',in:'query',description:'Presence enables indented JSON.',schema:{type:'string'}}
export function openapi(origin: string) {
 return {openapi:'3.0.3',info:{title:'Badminton API Japan',version:'0.1.0',description:'国内のバドミントン会場を使った学習・試作用API。認証不要。予約・空き状況・個人開放の保証はありません。',license:{name:'MIT (code); CC0-1.0 (original data and illustration); CC-BY-4.0 (contributed photos)'}},servers:[{url:origin}],
 paths:{
  '/venues':{get:{summary:'List/search venues',parameters:[{name:'page',in:'query',schema:{type:'integer',minimum:1,maximum:100000,default:1}},{name:'perPage',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:10}},{name:'prefecture',in:'query',description:'Exact Japanese prefecture name',schema:{type:'string',minLength:1,maxLength:20}},{name:'q',in:'query',description:'Substring of name, city, prefecture or ID (NFKC normalized)',schema:{type:'string',maxLength:100}},pretty],responses:{200:response(ref('VenuePage')),400:error}}},
  '/venues/{id}':{get:{summary:'Get venue',parameters:[pathId,pretty],responses:{200:response({type:'object',required:['venue'],properties:{venue:ref('Venue')}}),404:response(ref('Error'),'Not found')}}},
  '/prefectures':{get:{summary:'Prefectures with registered venues only',responses:{200:response({type:'object',properties:{prefectures:{type:'array',items:{type:'object',properties:{name:{type:'string'},venueCount:{type:'integer'}}}}}})}}},
  '/authors':{get:{summary:'List contributors',responses:{200:response({type:'object',properties:{authors:{type:'array',items:ref('Author')}}})}}},
  '/authors/{id}':{get:{summary:'Get contributor',parameters:[pathId],responses:{200:response({type:'object',properties:{author:ref('Author')}}),404:response(ref('Error'),'Not found')}}},
  '/health':{get:{summary:'Health and dataset size',responses:{200:response({type:'object',properties:{status:{type:'string'},version:{type:'string'},venueCount:{type:'integer'}}})}}},
  '/graphql':{post:{summary:'Read-only GraphQL',description:'Max body 16 KiB, query 8192 chars, depth 10, 100 fields. Named fragment spreads are not supported; use inline fragments.',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['query'],properties:{query:{type:'string',maxLength:8192},variables:{type:'object',additionalProperties:true},operationName:{type:'string'}}}}}},responses:{200:response({type:'object',properties:{data:{type:'object',nullable:true},errors:{type:'array',items:{type:'object',properties:{message:{type:'string'}}}}}}),400:response({type:'object'},'Invalid GraphQL request'),413:response(ref('Error'),'Body too large'),415:response({type:'object'},'Use application/json')}}},
  '/openapi.json':{get:{summary:'This OpenAPI document',responses:{200:response({type:'object'})}}}
 },components:{schemas:{Venue:venue,Author:{type:'object',required:['id','name','url'],properties:{id:{type:'string'},name:{type:'string'},url:{type:'string',format:'uri'}}},
  VenuePage:{type:'object',required:['venues','totalCount','pageInfo'],properties:{venues:{type:'array',items:ref('Venue')},totalCount:{type:'integer'},pageInfo:{type:'object',required:['currentPage','perPage','lastPage','prevPage','nextPage'],properties:{currentPage:{type:'integer'},perPage:{type:'integer'},lastPage:{type:'integer'},prevPage:{type:'integer',nullable:true},nextPage:{type:'integer',nullable:true}}}}},
  Error:{type:'object',properties:{error:{type:'object',required:['code','message'],properties:{code:{type:'string'},message:{type:'string'},details:{type:'array',items:{type:'object'}}}}}}
 }}}
}
