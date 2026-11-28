(() => {
  'use strict';

  const core = () => window.ZUNE_CORE;
  const layout = () => window.ZUNE_LAYOUT;
  const db = () => core().db();
  const actions = () => window.ZUNE_ACTIONS;

  let page = 0;
  let pageSize = 25;
  let total = 0;
  let currentUser = null;
  let overview = null;
  let searchTimer = null;
  let requestSequence = 0;

  const $ = id => document.getElementById(id);

  const esc = value =>
    layout().esc(value ?? '—');

  const formatNumber = value =>
    value == null ? '—' : Number(value).toLocaleString('en-TZ');

  const money = value =>
    layout().money(value ?? 0);

  const statusLabel = value => ({
    active: 'Active',
    suspended: 'Suspended',
    removed: 'Removed (temporary)'
  }[String(value || 'active')] || value || '—');


  const roleLabel = value => ({
    buyer: 'Buyer',
    vendor: 'Seller',
    driver: 'Driver',
    admin: 'Admin'
  }[value] || value || '—');


  async function rpc(name, args = {}) {

    if (window.ZUNE_AUTH_READY) {
      await window.ZUNE_AUTH_READY;
    }

    const { data, error } = await db().rpc(name, args);

    if (error) {
      throw error;
    }

    return data;
  }


  function setMetric(id, value) {

    const element = $(id);

    if (element) {
      element.textContent = formatNumber(value ?? 0);
    }
  }


  async function loadOverview() {

    overview = await rpc('admin_users_overview');


    const map = {
      usersTotalCount: 'total_users',
      activeUsers: 'active_users',
      suspendedUsers: 'suspended_users',
      removedUsers: 'removed_users',
      buyerUsers: 'buyers',
      sellerUsers: 'sellers',
      adminUsers: 'admins',
      verifiedUsers: 'verified_users',
      unverifiedUsers: 'unverified_users',
      pendingSellerUsers: 'pending_seller_applications',
      pendingVerificationUsers: 'pending_verification_applications'
    };


    Object.entries(map).forEach(([id,key]) => {

      setMetric(
        id,
        overview?.[key]
      );

    });

  }


  function getFilters() {

    return {

      p_search:
        $('usersSearch')?.value.trim() || null,

      p_role:
        $('usersRoleFilter')?.value || null,

      p_status:
        $('usersStatusFilter')?.value || null,

      p_limit:
        pageSize,

      p_offset:
        page * pageSize

    };

  }


  async function loadList() {

    const body = $('usersTableBody');


    if (body) {

      body.innerHTML =
      `
      <tr>
        <td colspan="8" class="empty-state">
          Inapakia watumiaji...
        </td>
      </tr>
      `;

    }


    const seq = ++requestSequence;


    const data =
      await rpc(
        'admin_list_users',
        getFilters()
      );


    if (seq !== requestSequence) {
      return;
    }


    // FIX MUHIMU:
    // RPC inaweza kurudisha users au items
    const items =
      Array.isArray(data?.items)
      ? data.items
      : (
          Array.isArray(data?.users)
          ? data.users
          : []
        );


    total =
      Number(data?.total || 0);


    layout().table(
      'usersTableBody',
      items,
      [
        {
          render: user =>
          `
          <div class="user-cell">
            <strong>
              ${esc(user.full_name || user.email || user.id)}
            </strong>

            <small>
              ${esc(user.zune_id || user.id)}
            </small>
          </div>
          `
        },

        {
          render:user =>
          esc(user.email)
        },

        {
          render:user =>
          esc(user.phone_number)
        },

        {
          render:user =>
          `
          <span class="badge-pill ${
            user.role === 'admin'
            ? 'warning'
            : 'success'
          }">

          ${esc(roleLabel(user.role))}

          </span>
          `
        },


        {
          render:user =>
          user.is_verified

          ?

          `
          <span class="badge-pill success">
          Verified
          </span>
          `

          :

          `
          <span class="badge-pill">
          Unverified
          </span>
          `
        },

        {
          render:user =>
          `
          <span class="badge-pill">
          ${esc(statusLabel(user.account_status))}
          </span>
          `
        },

        {
          render:user =>
          esc(layout().date(user.created_at))
        },


        {
          render:user =>
          `
          <button
          class="secondary-btn"
          type="button"
          data-user-view="${esc(user.id)}">

          Maelezo

          </button>
          `
        }

      ],

      'Hakuna mtumiaji anayelingana na vichujio.'

    );


    setMetric(
      'usersTotalCount',
      total
    );


    const info = $('usersPageInfo');

    if(info){

      info.textContent =
      total

      ?

      `Inaonyesha ${page*pageSize+1}–${Math.min((page+1)*pageSize,total)} kati ya ${total}`

      :

      'Hakuna matokeo';

    }

  }
  async function load() {

    try {

      await Promise.all([
        loadOverview(),
        loadList()
      ]);

    } catch(error) {

      core().error(
        'usersTableBody',
        error
      );

      layout().toast(
        error.message ||
        'Imeshindikana kupakia Users Management.',
        'error'
      );

    }

  }



  function section(title, content) {

    return `
    <section class="user-detail-section">

      <h4>
        ${title}
      </h4>

      ${content}

    </section>
    `;

  }



  function rowsTable(items, columns, emptyMessage) {


    if(
      !Array.isArray(items) ||
      !items.length
    ){

      return `
      <p class="users-muted">
        ${emptyMessage}
      </p>
      `;

    }


    return `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>

          ${
            columns
            .map(column =>
              `<th>${column[0]}</th>`
            )
            .join('')
          }

          </tr>

        </thead>


        <tbody>


        ${
          items.map(row =>

            `

            <tr>

            ${
              columns
              .map(column =>

                `

                <td>

                ${
                  esc(
                    typeof column[1] === 'function'
                    ? column[1](row)
                    : row[column[1]]
                  )

                }

                </td>

                `

              )
              .join('')

            }

            </tr>

            `

          )
          .join('')

        }


        </tbody>


      </table>


    </div>

    `;


  }





  function openDetails(data) {


    const profile =
      data.profile || {};


    const metrics =
      data.metrics || {};


    currentUser =
      profile;


    const host =
      $('usersDetailPanel');


    if(!host){
      return;
    }



    const profileLabels = {
      id:'Auth User ID', full_name:'Jina kamili', email:'Email', phone_number:'Namba ya simu',
      zune_id:'ZUNE ID', vendor_code:'Vendor code', role:'Aina ya akaunti',
      account_status:'Hali ya akaunti', is_verified:'Verified', gender:'Jinsia',
      date_of_birth:'Tarehe ya kuzaliwa', residential_address:'Anwani ya makazi',
      avatar_path:'Picha ya wasifu (Storage path)', created_at:'Tarehe ya usajili',
      suspended_at:'Tarehe ya kusimamishwa', removed_at:'Tarehe ya kuondolewa',
      status_updated_by:'Aliyesasisha hali', removal_type:'Aina ya kuondoa'
    };
    const displayValue = (key,value) => {
      if (value === null || value === undefined || value === '') return 'Haijawekwa';
      if (key === 'role') return roleLabel(value);
      if (key === 'is_verified') return value ? 'Verified' : 'Not verified';
      if (key === 'gender') return ({male:'Mwanaume',female:'Mwanamke',other:'Nyingine',prefer_not_to_say:'Hajataja'})[value] || value;
      if ((key === 'date_of_birth' || key.endsWith('_date') || key.endsWith('_at')) && typeof value === 'string') return layout().date(value);
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    const fields = Object.entries(profile).map(([key,value]) => [
      profileLabels[key] || key.replaceAll('_',' ').replace(/\\b\\w/g,c=>c.toUpperCase()),
      displayValue(key,value)
    ]);
    const details = fields.map(field => `
      <div><span>${esc(field[0])}</span><strong>${esc(field[1])}</strong></div>
    `).join('');
    const objectDetails = (obj, omit=[]) => {
      if (!obj || typeof obj !== 'object') return '<p class="users-muted">Hakuna taarifa zilizohifadhiwa.</p>';
      const pairs = Object.entries(obj).filter(([key])=>!omit.includes(key));
      if (!pairs.length) return '<p class="users-muted">Hakuna taarifa zilizohifadhiwa.</p>';
      return '<div class="user-detail-grid">'+pairs.map(([key,value])=>`
        <div><span>${esc(key.replaceAll('_',' '))}</span><strong>${esc(displayValue(key,value))}</strong></div>
      `).join('')+'</div>';
    };
    const autoRowsTable = rows => {
      if (!Array.isArray(rows) || !rows.length) return '<p class="users-muted">Hakuna rekodi zilizohifadhiwa.</p>';
      const keys = Object.keys(rows[0]).filter(key => !['raw_user_meta_data','raw_app_meta_data'].includes(key)).slice(0,10);
      return '<div class="table-wrap"><table><thead><tr>'+keys.map(key=>'<th>'+esc(key.replaceAll('_',' '))+'</th>').join('')+'</tr></thead><tbody>'+
        rows.map(row=>'<tr>'+keys.map(key=>'<td>'+esc(displayValue(key,row[key]))+'</td>').join('')+'</tr>').join('')+
        '</tbody></table></div>';
    };
    const metricCards = [

      [
        'Wallet balance',
        money(metrics.wallet_balance)
      ],

      [
        'Products',
        formatNumber(metrics.products)
      ],

      [
        'Buyer orders',
        formatNumber(metrics.buyer_orders)
      ],

      [
        'Seller orders',
        formatNumber(metrics.seller_orders)
      ],

      [
        'Payments',
        formatNumber(metrics.payments)
      ],

      [
        'Disputes',
        formatNumber(metrics.disputes)
      ],

      [
        'Support tickets',
        formatNumber(metrics.support_tickets)
      ]

    ];



    const metricHTML =
      metricCards.map(item =>

        `

        <article class="user-mini-metric">

          <small>
          ${esc(item[0])}
          </small>


          <strong>
          ${esc(item[1])}
          </strong>


        </article>

        `

      )
      .join('');



    const protectedUser =
      profile.role === 'admin' ||
      profile.id === window.ZUNE_CURRENT_USER?.id;



    const status =
      String(
        profile.account_status || 'active'
      );



    const actionHTML = protectedUser

    ?

    `

    <p class="users-muted">

    Akaunti hii imelindwa dhidi ya mabadiliko kupitia ukurasa huu.

    </p>

    `


    :

    `

    <div class="users-action-grid">


      <button
      class="warning-btn"
      data-user-action="suspended">

      Suspend

      </button>



      <button
      class="secondary-btn"
      data-user-action="active">

      Restore

      </button>



      <button
      class="danger-btn"
      data-user-action="removed">

      Temporary Remove

      </button>



      <button
      class="secondary-btn"
      data-user-role="buyer">

      Badilisha kuwa Buyer

      </button>



      <button
      class="secondary-btn"
      data-user-role="vendor">

      Badilisha kuwa Seller

      </button>



      <button
      class="secondary-btn"
      data-user-badge="${
        profile.is_verified
        ? 'revoke'
        : 'grant'
      }">

      ${
        profile.is_verified
        ? 'Ondoa Verified Badge'
        : 'Toa Verified Badge'
      }


      </button>


    </div>

    `;


    const linkedSections = [
      section('Akaunti ya Supabase Auth', objectDetails(data.auth_account, ['id'])),
      section('Taarifa za Duka / Seller', objectDetails(data.store)),
      section('Taarifa za Dereva', objectDetails(data.driver_profile)),
      section('Anwani za Delivery', rowsTable(data.delivery_addresses, [
        ['Mpokeaji','recipient_name'],['Simu','phone'],['Nchi','country'],['Mkoa','region'],
        ['Wilaya','district'],['Kata','ward'],['Mtaa','street'],['Alama ya karibu','landmark'],
        ['Latitude','latitude'],['Longitude','longitude'],['Anwani chaguo-msingi','is_default'],['Maelekezo','delivery_notes']
      ], 'Hakuna anwani za delivery.')),
      section('Maombi ya Dereva', rowsTable(data.driver_applications, [
        ['Chanzo','application_source'],['Hali','status'],['Imetumwa','submitted_at'],
        ['Imehakikiwa','reviewed_at'],['Maelezo','review_note']
      ], 'Hakuna maombi ya dereva.')),
      section('Nyaraka za Dereva', rowsTable(data.driver_documents, [
        ['Aina ya nyaraka','document_type'],['Jina la faili','original_file_name'],
        ['Aina ya faili','mime_type'],['Ukubwa (bytes)','file_size'],['Inaisha','expiry_date'],
        ['Hali','status'],['Maelezo ya ukaguzi','review_note']
      ], 'Hakuna nyaraka za dereva.')),
      section('Maombi ya Seller', rowsTable(data.seller_applications, [
        ['Duka','store_name'],['Hali','status'],['Tarehe','created_at'],['Maelezo','admin_note']
      ], 'Hakuna maombi ya Seller.')),
      section('Verification Applications', rowsTable(data.verification_applications, [
        ['Aina','verification_type'],['Sababu','reason'],['Hali','status'],['Tarehe','created_at']
      ], 'Hakuna maombi ya verification.')),
      section('Verification Requests', rowsTable(data.verification_requests, [
        ['Aina ya nyaraka','document_type'],['Namba ya nyaraka','document_number'],
        ['Aina','verification_type'],['Hali','status'],['Tarehe','created_at'],['Maelezo','admin_note']
      ], 'Hakuna verification requests.')),
      section('Bidhaa za Mtumiaji / Seller', autoRowsTable(data.products)),
      section('Oda alizonunua', autoRowsTable(data.buyer_orders)),
      section('Oda alizouza', autoRowsTable(data.seller_orders)),
      section('Malipo ya Mtumiaji', autoRowsTable(data.payments)),
      section('Malipo ya Oda', autoRowsTable(data.order_payments)),
      section('Wallet Transactions', autoRowsTable(data.wallet_transactions)),
      section('Withdrawal Requests', autoRowsTable(data.withdrawals)),
      section('Disputes', autoRowsTable(data.disputes)),
      section('Support Tickets', autoRowsTable(data.support_tickets)),
      section('Admin Actions History', autoRowsTable(data.admin_actions))
    ].join('');
    host.innerHTML =

    `

    <div class="users-detail-head">

      <div>

        <p class="eyebrow">
        USER PROFILE
        </p>


        <h3>
        ${esc(profile.full_name || profile.email)}
        </h3>


        <p>
        ${esc(roleLabel(profile.role))}
        </p>


      </div>


      <button
      class="secondary-btn"
      id="closeUsersDetails">

      Funga

      </button>


    </div>



    <div class="user-detail-grid">

    ${details}

    </div>



    <div class="user-mini-metrics">

    ${metricHTML}

    </div>



    ${section(
      'Account Control',
      actionHTML
    )}



    ${linkedSections}

    `;



    host.hidden = false;

    host.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });


  }
  async function viewUser(id) {

    try {

      const data =
        await rpc(
          'admin_get_user_details',
          {
            p_user_id:id
          }
        );


      openDetails(
        data || {}
      );


    } catch(error) {


      layout().toast(
        error.message ||
        'Imeshindikana kupata taarifa za mtumiaji.',
        'error'
      );


    }

  }





  function performStatus(status) {


    const user =
      currentUser;


    if(!user){
      return;
    }



    const label =
      statusLabel(status);



    actions().confirm({

      title:
      `Badilisha hali: ${label}`,


      message:
      `${user.full_name || user.email} — hali mpya: ${label}. Andika sababu.`,


      confirmText:
      label,



      fn:
      async reason => {


        await rpc(
          'admin_set_user_status',
          {

            target_user_id:
            user.id,


            new_status:
            status,


            action_reason:
            reason

          }
        );



        layout().toast(
          `Hali ya akaunti imebadilishwa: ${label}.`,
          'success'
        );



        await viewUser(
          user.id
        );


        await load();


      }


    });


  }







  function performRole(role) {


    const user =
      currentUser;


    if(!user){
      return;
    }




    actions().confirm({


      title:
      `Badilisha role: ${roleLabel(role)}`,



      message:
      `${user.full_name || user.email} atakuwa ${roleLabel(role)}. Andika sababu.`,



      confirmText:
      'Badilisha',



      fn:
      async reason => {



        await rpc(
          'admin_change_user_role',
          {

            p_user_id:
            user.id,


            p_new_role:
            role,


            p_reason:
            reason

          }
        );



        layout().toast(
          'Role imebadilishwa kwa mafanikio.',
          'success'
        );



        await viewUser(
          user.id
        );


        await load();


      }


    });



  }








  function performBadge(mode) {


    const user =
      currentUser;


    if(!user){
      return;
    }



    const grant =
      mode === 'grant';




    actions().confirm({


      title:
      grant
      ? 'Toa Verified Badge'
      : 'Ondoa Verified Badge',



      message:
      `${user.full_name || user.email}. Andika sababu.`,



      confirmText:
      grant
      ? 'Toa Badge'
      : 'Ondoa Badge',




      fn:
      async reason => {



        await rpc(
          'admin_set_badge',
          {

            p_user_id:
            user.id,


            p_grant:
            grant,


            p_reason:
            reason

          }
        );



        layout().toast(

          grant
          ? 'Verified Badge imetolewa.'
          : 'Verified Badge imeondolewa.',

          'success'

        );



        await viewUser(
          user.id
        );


        await load();



        window.ZUNE_BADGES?.loadVerified();



      }


    });


  }







  async function exportUsers() {


    const button =
      $('exportUsersBtn');



    if(button){
      button.disabled = true;
    }




    try {


      const filters =
        getFilters();



      const rows = [

        [
          'ZUNE ID',
          'Jina',
          'Email',
          'Simu',
          'Role',
          'Verified',
          'Hali',
          'Alijiunga'
        ]

      ];



      let offset = 0;

      let totalExport = Infinity;



      while(
        offset < totalExport &&
        offset < 10000
      ){


        const result =
          await rpc(
            'admin_list_users',
            {

              ...filters,

              p_limit:500,

              p_offset:offset

            }
          );



        const users =
          Array.isArray(result?.items)

          ?

          result.items

          :

          (
            Array.isArray(result?.users)

            ?

            result.users

            :

            []

          );



        totalExport =
          Number(result?.total || 0);




        if(!users.length){
          break;
        }



        users.forEach(user => {


          rows.push([

            user.zune_id || user.id,

            user.full_name,

            user.email,

            user.phone_number,

            roleLabel(user.role),

            user.is_verified
            ? 'Verified'
            : 'Unverified',

            statusLabel(user.account_status),

            user.created_at

          ]);



        });



        offset += 500;


      }




      actions().downloadCsv(
        'zune-users',
        rows
      );



      layout().toast(
        `Zimesafirishwa: ${rows.length-1} watumiaji.`,
        'success'
      );



    } catch(error) {



      layout().toast(
        error.message ||
        'Export imeshindikana.',
        'error'
      );



    } finally {


      if(button){
        button.disabled=false;
      }


    }


  }
  document.addEventListener(
    'DOMContentLoaded',
    () => {


      $('exportUsersBtn')
      ?.addEventListener(
        'click',
        exportUsers
      );



      [
        'usersRoleFilter',
        'usersStatusFilter'
      ]
      .forEach(id => {


        $(id)
        ?.addEventListener(
          'change',
          () => {

            page = 0;

            loadList()
            .catch(error =>
              core().error(
                'usersTableBody',
                error
              )
            );

          }
        );


      });





      $('usersSearch')
      ?.addEventListener(
        'input',
        () => {


          clearTimeout(
            searchTimer
          );



          searchTimer =
          setTimeout(
            () => {

              page = 0;


              loadList()
              .catch(error =>
                core().error(
                  'usersTableBody',
                  error
                )
              );


            },

            350

          );


        }
      );







      $('usersPrevPage')
      ?.addEventListener(
        'click',
        () => {


          if(page > 0){

            page--;


            loadList()
            .catch(error =>
              core().error(
                'usersTableBody',
                error
              )
            );


          }


        }
      );








      $('usersNextPage')
      ?.addEventListener(
        'click',
        () => {


          if(
            (page + 1) * pageSize < total
          ){


            page++;


            loadList()
            .catch(error =>
              core().error(
                'usersTableBody',
                error
              )
            );


          }


        }
      );







      $('usersTableBody')
      ?.addEventListener(
        'click',
        event => {


          const button =
          event.target.closest(
            '[data-user-view]'
          );



          if(button){


            viewUser(
              button.dataset.userView
            );


          }


        }
      );








      $('usersDetailPanel')
      ?.addEventListener(
        'click',
        event => {



          const close =
          event.target.closest(
            '#closeUsersDetails'
          );



          if(close){


            $('usersDetailPanel')
            .hidden = true;


            currentUser = null;


            return;


          }






          const status =
          event.target.closest(
            '[data-user-action]'
          );



          if(status){


            performStatus(
              status.dataset.userAction
            );


            return;


          }







          const role =
          event.target.closest(
            '[data-user-role]'
          );



          if(role){


            performRole(
              role.dataset.userRole
            );


            return;


          }







          const badge =
          event.target.closest(
            '[data-user-badge]'
          );



          if(badge){


            performBadge(
              badge.dataset.userBadge
            );


          }



        }
      );



    }
  );








  document.addEventListener(
    'zune:page-changed',
    event => {


      if(
        event.detail.page === 'users'
      ){

        load();

      }


    }
  );







  document.addEventListener(
    'zune:admin-refresh',
    () => {


      if(
        window.ZUNE_ROUTER?.current === 'users'
      ){

        load();

      }


    }
  );







  window.ZUNE_USERS = {

    load,

    viewUser,

    get overview(){

      return overview;

    }

  };



})();