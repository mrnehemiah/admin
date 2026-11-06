// Table/column names verified against the connected ZUNE project's public schema.
export const MODULES={
 users:{title:'Watumiaji',table:'profiles',order:'created_at',columns:[['full_name','Jina'],['email','Barua pepe'],['phone_number','Simu'],['role','Aina'],['account_status','Hali'],['is_verified','Verified'],['created_at','Tarehe']]},
 sellers:{title:'Maduka / Wauzaji',table:'seller_applications',order:'created_at',columns:[['store_name','Duka'],['owner_name','Mmiliki'],['phone','Simu'],['region','Mkoa'],['status','Hali'],['created_at','Tarehe']]},
 products:{title:'Bidhaa',table:'products',order:'created_at',columns:[['title','Bidhaa'],['vendor_id','Muuzaji'],['category','Category'],['price','Bei'],['stock_quantity','Stock'],['is_featured','Featured']]},
 orders:{title:'Oda',table:'orders',order:'created_at',columns:[['id','Order ID'],['buyer_id','Buyer'],['total_price','Jumla'],['status','Hali'],['payment_status','Malipo'],['created_at','Tarehe']]},
 payments:{title:'Malipo',table:'payments',order:'created_at',columns:[['order_id','Order'],['buyer_id','Buyer'],['amount','Kiasi'],['payment_method','Njia'],['transaction_reference','Reference'],['payment_status','Hali']]},
 paymentTransactions:{title:'Payment transactions',table:'payment_transactions',order:'created_at',columns:[['reference_code','Reference'],['purpose','Purpose'],['amount','Kiasi'],['network_code','Network'],['status','Hali'],['submitted_at','Tarehe']]},
 wallet:{title:'Wallet',table:'wallets',order:'updated_at',columns:[['user_id','Mtumiaji'],['balance','Salio'],['updated_at','Last update']]},
 walletTransactions:{title:'Wallet transactions',table:'admin_wallet_transactions',order:'created_at',columns:[['reference','Reference'],['user_id','Mtumiaji'],['transaction_type','Aina'],['direction','Direction'],['amount','Kiasi'],['status','Hali']]},
 verification:{title:'Verification',table:'verification_applications',order:'created_at',columns:[['full_name','Jina'],['verification_type','Aina'],['reason','Sababu'],['status','Hali'],['created_at','Tarehe']]},
 verificationRequests:{title:'Verification requests',table:'verification_requests',order:'created_at',columns:[['full_name','Jina'],['document_type','Aina ya nyaraka'],['role','Role'],['status','Hali'],['created_at','Tarehe']]},
 disputes:{title:'Disputes',table:'transaction_disputes',order:'created_at',columns:[['case_number','Case'],['issue_type','Tatizo'],['amount','Kiasi'],['status','Hali'],['created_at','Tarehe']]},
 support:{title:'Support tickets',table:'support_tickets',order:'created_at',columns:[['customer_name','Mteja'],['category','Category'],['message','Ujumbe'],['status','Hali'],['created_at','Tarehe']]},
 coupons:{title:'Coupons',table:'coupons',order:'created_at',columns:[['code','Code'],['discount_type','Aina'],['discount_value','Discount'],['usage_count','Matumizi'],['status','Hali'],['expires_at','Expiry']]},
 delivery:{title:'Delivery pricing',table:'delivery_pricing',order:'created_at',columns:[['zone_name','Zone'],['region','Mkoa'],['district','Wilaya'],['base_fee','Base fee'],['price_per_km','Kwa km'],['is_active','Active']]},
 announcements:{title:'Announcements',table:'admin_announcements',order:'created_at',columns:[['title','Title'],['audience','Audience'],['priority','Priority'],['status','Hali'],['created_at','Tarehe']]},
 audit:{title:'Activity logs',table:'admin_activity_logs',order:'created_at',columns:[['action','Action'],['target_type','Target'],['target_id','Target ID'],['reason','Sababu'],['result','Matokeo'],['created_at','Tarehe']]},
 settings:{title:'Admin settings',table:'admin_settings',order:'updated_at',columns:[['setting_key','Setting'],['setting_value','Value'],['description','Maelezo'],['updated_at','Updated']]}
};
