// ======================================================
// NIVRA - INTERNAL MESSAGES
// File: js/messages.js
// ======================================================

import { supabase } from "./supabase.js";

// ------------------------------------------------------
// 1) العناصر الأساسية من messages.html
// ------------------------------------------------------

const $ = (id) => document.getElementById(id);

const els = {
    chatSidebar: $("chatSidebar"),
    openSidebarBtn: $("openSidebarBtn"),
    closeSidebarBtn: $("closeSidebarBtn"),
    mobileBackBtn: $("mobileBackBtn"),

    myAvatar: $("myAvatar"),
    myName: $("myName"),

    employeeSearch: $("employeeSearch"),
    employeeCount: $("employeeCount"),
    employeesList: $("employeesList"),

    welcomeScreen: $("welcomeScreen"),
    chatScreen: $("chatScreen"),

    chatAvatar: $("chatAvatar"),
    chatName: $("chatName"),

    searchMessagesBtn: $("searchMessagesBtn"),
    conversationInfoBtn: $("conversationInfoBtn"),
    conversationMenuBtn: $("conversationMenuBtn"),
    conversationDropdown: $("conversationDropdown"),

    chatSearchPanel: $("chatSearchPanel"),
    messageSearchInput: $("messageSearchInput"),
    closeMessageSearchBtn: $("closeMessageSearchBtn"),

    messagesList: $("messagesList"),

    editingIndicator: $("editingIndicator"),
    cancelEditBtn: $("cancelEditBtn"),

    messageForm: $("messageForm"),
    messageInput: $("messageInput"),
    sendButton: $("sendButton"),
    sendButtonText: $("sendButtonText"),
    characterCounter: $("characterCounter"),

    messageContextMenu: $("messageContextMenu"),

    confirmModal: $("confirmModal"),
    confirmIcon: $("confirmIcon"),
    confirmTitle: $("confirmTitle"),
    confirmMessage: $("confirmMessage"),
    confirmWarning: $("confirmWarning"),
    closeConfirmModal: $("closeConfirmModal"),
    cancelConfirmBtn: $("cancelConfirmBtn"),
    confirmActionBtn: $("confirmActionBtn"),

    toastContainer: $("toastContainer"),

    employeeInfoModal: $("employeeInfoModal"),
    infoEmployeeAvatar: $("infoEmployeeAvatar"),
    employeeInfoTitle: $("employeeInfoTitle"),
    infoEmployeeName: $("infoEmployeeName"),
    closeEmployeeInfoBtn: $("closeEmployeeInfoBtn"),
    closeEmployeeInfoFooter: $("closeEmployeeInfoFooter")
};

// ------------------------------------------------------
// 2) الحالة العامة
// ------------------------------------------------------

let myProfile = null;
let myId = null;

let employees = [];
let conversations = [];
let messages = [];

let activeEmployee = null;
let activeConversationId = null;

let activeFilter = "all";
let activeMessageId = null;
let editingMessageId = null;

let realtimeChannel = null;
let confirmCallback = null;

let isLoadingMessages = false;
let isSendingMessage = false;

// إخفاء المحادثات محلياً لهذا الموظف فقط
// لا يحذف المحادثة أو الرسائل من قاعدة البيانات.
const hiddenStorageKey = () =>
    `nivra_hidden_conversations_${myId}`;

function getHiddenConversations() {
    try {
        return JSON.parse(
            localStorage.getItem(hiddenStorageKey()) || "[]"
        );
    } catch {
        return [];
    }
}

function saveHiddenConversations(ids) {
    localStorage.setItem(
        hiddenStorageKey(),
        JSON.stringify([...new Set(ids)])
    );
}

function isConversationHidden(id) {
    return getHiddenConversations().includes(id);
}

// ------------------------------------------------------
// 3) أدوات مساعدة
// ------------------------------------------------------

function normalizeRpcData(data) {
    if (Array.isArray(data)) return data[0] || null;
    return data || null;
}

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getInitials(name = "") {
    const words = String(name).trim().split(/\s+/).filter(Boolean);

    if (!words.length) return "N";

    return words
        .slice(0, 2)
        .map(word => word.charAt(0))
        .join("")
        .toUpperCase();
}

function formatTime(value) {
    if (!value) return "";

    return new Date(value).toLocaleTimeString("ar-IQ", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDate(value) {
    if (!value) return "";

    return new Date(value).toLocaleDateString("ar-IQ", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function showToast(message, type = "success") {
    if (!els.toastContainer) {
        console.log(message);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon = type === "error"
        ? "⚠"
        : type === "warning"
            ? "!"
            : "✓";

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${escapeHTML(message)}</span>
    `;

    els.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

function setHidden(element, hidden = true) {
    if (!element) return;

    element.hidden = hidden;
    element.classList.toggle("hidden", hidden);
}

function closeDropdown() {
    setHidden(els.conversationDropdown, true);
}

function closeContextMenu() {
    setHidden(els.messageContextMenu, true);
    activeMessageId = null;
}

function scrollMessagesToBottom() {
    if (!els.messagesList) return;

    els.messagesList.scrollTop =
        els.messagesList.scrollHeight;
}

function getOtherUserId(conversation) {
    if (!conversation || !myId) return null;

    return conversation.user_one_id === myId
        ? conversation.user_two_id
        : conversation.user_one_id;
}

function getEmployeeById(id) {
    return employees.find(employee => employee.id === id);
}

function setAvatar(element, name) {
    if (!element) return;

    element.textContent = getInitials(name);
}

// ------------------------------------------------------
// 4) جلب بيانات الموظف الحالي
// ------------------------------------------------------

async function loadMyProfile() {
    const { data, error } = await supabase.rpc(
        "get_my_chat_profile"
    );

    if (error) {
        console.error("Profile error:", error);
        throw new Error("تعذر جلب بيانات حسابك.");
    }

    myProfile = normalizeRpcData(data);

    if (!myProfile || !myProfile.id) {
        throw new Error(
            "لم يتم العثور على ملف الموظف المرتبط بحسابك."
        );
    }

    myId = myProfile.id;

    if (els.myName) {
        els.myName.textContent =
            myProfile.name || "موظف NIVRA";
    }

    setAvatar(
        els.myAvatar,
        myProfile.name || "NIVRA"
    );
}

// ------------------------------------------------------
// 5) جلب قائمة الموظفين
// ------------------------------------------------------

async function loadEmployees() {
    const { data, error } = await supabase.rpc(
        "get_chat_employees"
    );

    if (error) {
        console.error("Employees error:", error);
        throw new Error("تعذر تحميل قائمة الموظفين.");
    }

    employees = (data || []).filter(employee =>
        employee.id &&
        employee.id !== myId &&
        employee.role !== "customer"
    );

    if (els.employeeCount) {
        els.employeeCount.textContent = employees.length;
    }
}

// ------------------------------------------------------
// 6) جلب المحادثات والرسائل الأخيرة
// ------------------------------------------------------

async function loadConversations() {
    const { data: conversationData, error } = await supabase
        .from("direct_conversations")
        .select("*")
        .or(`user_one_id.eq.${myId},user_two_id.eq.${myId}`);

    if (error) {
        console.error("Conversations error:", error);
        throw new Error("تعذر تحميل المحادثات.");
    }

    conversations = conversationData || [];

    if (!conversations.length) {
        renderEmployees();
        return;
    }

    const conversationIds = conversations.map(item => item.id);

    const { data: messageData, error: messageError } =
        await supabase
            .from("direct_messages")
            .select("*")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false });

    if (messageError) {
        console.error("Last messages error:", messageError);
        throw new Error("تعذر تحميل آخر الرسائل.");
    }

    const allMessages = messageData || [];

    conversations = conversations.map(conversation => {
        const conversationMessages = allMessages.filter(
            message =>
                message.conversation_id === conversation.id
        );

        const latestMessage = conversationMessages[0] || null;

        const unreadCount = conversationMessages.filter(
            message =>
                message.sender_user_id !== myId &&
                !message.read_at
        ).length;

        return {
            ...conversation,
            latestMessage,
            unreadCount
        };
    });

    renderEmployees();
}

// ------------------------------------------------------
// 7) عرض الموظفين والمحادثات في القائمة الجانبية
// ------------------------------------------------------

function renderEmployees() {
    if (!els.employeesList) return;

    const searchTerm =
        (els.employeeSearch?.value || "")
            .trim()
            .toLowerCase();

    let list = employees.map(employee => {
        const conversation = conversations.find(item =>
            getOtherUserId(item) === employee.id
        );

        return {
            ...employee,
            conversation,
            latestMessage: conversation?.latestMessage || null,
            unreadCount: conversation?.unreadCount || 0
        };
    });

    if (activeFilter === "unread") {
        list = list.filter(item => item.unreadCount > 0);
    }

    if (searchTerm) {
        list = list.filter(item =>
            (item.name || "").toLowerCase().includes(searchTerm) ||
            (item.email || "").toLowerCase().includes(searchTerm)
        );
    }

    // المحادثات الأحدث أولاً، ثم بقية الموظفين
    list.sort((a, b) => {
        const dateA = a.latestMessage
            ? new Date(a.latestMessage.created_at).getTime()
            : 0;

        const dateB = b.latestMessage
            ? new Date(b.latestMessage.created_at).getTime()
            : 0;

        return dateB - dateA;
    });

    if (!list.length) {
        els.employeesList.innerHTML = `
            <div class="empty-employees">
                <span>لا توجد نتائج</span>
            </div>
        `;
        return;
    }

    els.employeesList.innerHTML = list.map(employee => {
        const conversation = employee.conversation;
        const hidden = conversation &&
            isConversationHidden(conversation.id);

        // المحادثة المخفية تختفي من قائمتك فقط
        if (hidden) return "";

        const isActive =
            activeEmployee?.id === employee.id;

        const lastMessage = employee.latestMessage;

        let preview = "ابدأ محادثة جديدة";

        if (lastMessage) {
            const prefix =
                lastMessage.sender_user_id === myId
                    ? "أنت: "
                    : "";

            preview = prefix + lastMessage.body;
        }

        return `
            <button
                type="button"
                class="employee-item ${isActive ? "active" : ""} ${employee.unreadCount ? "has-unread" : ""}"
                data-employee-id="${escapeHTML(employee.id)}"
            >
                <span class="employee-avatar">
                    ${escapeHTML(getInitials(employee.name))}
                </span>

                <span class="employee-details">
                    <span class="employee-name">
                        ${escapeHTML(employee.name || "موظف")}
                    </span>

                    <span class="employee-last-message">
                        ${escapeHTML(preview)}
                    </span>
                </span>

                <span class="employee-meta">
                    ${
                        employee.unreadCount
                            ? `<span class="unread-count">${employee.unreadCount}</span>`
                            : ""
                    }

                    ${
                        lastMessage
                            ? `<span class="employee-time">${formatTime(lastMessage.created_at)}</span>`
                            : ""
                    }
                </span>
            </button>
        `;
    }).join("");

    if (!els.employeesList.innerHTML.trim()) {
        els.employeesList.innerHTML = `
            <div class="empty-employees">
                <span>لا توجد محادثات ظاهرة</span>
            </div>
        `;
    }
}

// ------------------------------------------------------
// 8) إنشاء محادثة أو جلب المحادثة الموجودة
// ------------------------------------------------------

function sortUUIDs(firstId, secondId) {
    return [firstId, secondId].sort((a, b) =>
        a.localeCompare(b)
    );
}

async function getOrCreateConversation(employeeId) {
    const [userOneId, userTwoId] =
        sortUUIDs(myId, employeeId);

    const { data: existing, error: findError } =
        await supabase
            .from("direct_conversations")
            .select("*")
            .eq("user_one_id", userOneId)
            .eq("user_two_id", userTwoId)
            .maybeSingle();

    if (findError) {
        console.error(findError);
        throw new Error("تعذر التحقق من المحادثة.");
    }

    if (existing) return existing;

    const { data: created, error: createError } =
        await supabase
            .from("direct_conversations")
            .insert({
                user_one_id: userOneId,
                user_two_id: userTwoId
            })
            .select()
            .single();

    if (!createError && created) {
        return created;
    }

    // إذا أنشأ الطرف الآخر المحادثة بنفس اللحظة
    // نحاول جلبها مرة ثانية بدلاً من إنشاء نسخة ثانية.
    const { data: retry, error: retryError } =
        await supabase
            .from("direct_conversations")
            .select("*")
            .eq("user_one_id", userOneId)
            .eq("user_two_id", userTwoId)
            .maybeSingle();

    if (!retryError && retry) {
        return retry;
    }

    console.error("Create conversation error:", createError);
    throw new Error("تعذر إنشاء المحادثة.");
}

// ------------------------------------------------------
// 9) فتح محادثة موظف
// ------------------------------------------------------

async function openConversation(employeeId) {
    const employee = getEmployeeById(employeeId);

    if (!employee) return;

    try {
        activeEmployee = employee;

        if (els.chatName) {
            els.chatName.textContent = employee.name || "موظف";
        }

        setAvatar(
            els.chatAvatar,
            employee.name || "موظف"
        );

        setHidden(els.welcomeScreen, true);
        setHidden(els.chatScreen, false);

        els.chatSidebar?.classList.remove("sidebar-open");

        renderEmployees();

        const conversation =
            await getOrCreateConversation(employeeId);

        activeConversationId = conversation.id;

        // إذا كانت المحادثة مخفية عند المستخدم الحالي
        // نعيد إظهارها عند فتحها من قائمة الموظفين.
        const hiddenIds = getHiddenConversations()
            .filter(id => id !== activeConversationId);

        saveHiddenConversations(hiddenIds);

        await loadActiveMessages();
        await markMessagesAsRead();
        subscribeToActiveConversation();

        await loadConversations();
        renderEmployees();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "حدث خطأ أثناء فتح المحادثة.",
            "error"
        );
    }
}

// ------------------------------------------------------
// 10) تحميل رسائل المحادثة الحالية
// ------------------------------------------------------

async function loadActiveMessages() {
    if (!activeConversationId || isLoadingMessages) return;

    isLoadingMessages = true;

    try {
        const { data, error } = await supabase
            .from("direct_messages")
            .select("*")
            .eq("conversation_id", activeConversationId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        messages = data || [];

        renderMessages();

    } catch (error) {
        console.error("Messages load error:", error);
        showToast("تعذر تحميل الرسائل.", "error");

    } finally {
        isLoadingMessages = false;
    }
}

// ------------------------------------------------------
// 11) عرض الرسائل
// ------------------------------------------------------

function renderMessages() {
    if (!els.messagesList) return;

    const searchTerm =
        (els.messageSearchInput?.value || "")
            .trim()
            .toLowerCase();

    let visibleMessages = [...messages];

    if (searchTerm) {
        visibleMessages = visibleMessages.filter(message =>
            (message.body || "").toLowerCase().includes(searchTerm)
        );
    }

    if (!visibleMessages.length) {
        els.messagesList.innerHTML = `
            <div class="empty-messages">
                <span>${searchTerm ? "لا توجد رسائل مطابقة للبحث" : "لا توجد رسائل بعد، ابدأ المحادثة الآن 🌸"}</span>
            </div>
        `;
        return;
    }

    els.messagesList.innerHTML = visibleMessages.map(message => {
        const isMine = message.sender_user_id === myId;

        return `
            <div
                class="message-row ${isMine ? "own-message" : "other-message"}"
                data-message-id="${escapeHTML(message.id)}"
            >
                <div class="message-bubble">
                    <div class="message-content">
                        ${escapeHTML(message.body).replace(/\n/g, "<br>")}
                    </div>

                    <div class="message-footer">
                        ${
                            message.edited_at
                                ? `<span class="edited-label">تم التعديل</span>`
                                : ""
                        }

                        <span class="message-time">
                            ${formatTime(message.created_at)}
                        </span>

                        ${
                            isMine
                                ? `<span class="message-read-status">${message.read_at ? "✓✓" : "✓"}</span>`
                                : ""
                        }
                    </div>

                    <button
                        type="button"
                        class="message-actions-trigger"
                        data-message-menu="${escapeHTML(message.id)}"
                        aria-label="خيارات الرسالة"
                    >⋯</button>
                </div>
            </div>
        `;
    }).join("");

    scrollMessagesToBottom();
}

// ------------------------------------------------------
// 12) إرسال رسالة جديدة
// ------------------------------------------------------

async function sendMessage(event) {
    event?.preventDefault();

    if (!activeConversationId || !myId) {
        showToast("اختَر موظفاً أولاً.", "warning");
        return;
    }

    if (isSendingMessage) return;

    const body = (els.messageInput?.value || "").trim();

    if (!body) return;

    if (body.length > 5000) {
        showToast("الرسالة أطول من الحد المسموح.", "warning");
        return;
    }

    isSendingMessage = true;

    if (els.sendButton) {
        els.sendButton.disabled = true;
    }

    try {
        const { error } = await supabase
            .from("direct_messages")
            .insert({
                conversation_id: activeConversationId,
                sender_user_id: myId,
                body
            });

        if (error) throw error;

        els.messageInput.value = "";
        updateCharacterCounter();
        resizeMessageInput();

        // Realtime سيضيف الرسالة أيضاً،
        // لكن نعيد التحميل هنا لضمان ظهورها.
        await loadActiveMessages();
        await loadConversations();

    } catch (error) {
        console.error("Send message error:", error);
        showToast(
            "تعذر إرسال الرسالة. حاول مرة ثانية.",
            "error"
        );

    } finally {
        isSendingMessage = false;

        if (els.sendButton) {
            els.sendButton.disabled = false;
        }

        els.messageInput?.focus();
    }
}

// ------------------------------------------------------
// 13) تعليم الرسائل الواردة كمقروءة
// ------------------------------------------------------

async function markMessagesAsRead() {
    if (!activeConversationId || !myId) return;

    const unreadMessages = messages.filter(message =>
        message.sender_user_id !== myId &&
        !message.read_at
    );

    if (!unreadMessages.length) return;

    const { error } = await supabase
        .from("direct_messages")
        .update({
            read_at: new Date().toISOString()
        })
        .eq("conversation_id", activeConversationId)
        .neq("sender_user_id", myId)
        .is("read_at", null);

    if (error) {
        console.error("Mark as read error:", error);
        return;
    }

    messages = messages.map(message => {
        if (
            message.sender_user_id !== myId &&
            !message.read_at
        ) {
            return {
                ...message,
                read_at: new Date().toISOString()
            };
        }

        return message;
    });

    renderMessages();
    await loadConversations();
}

// ------------------------------------------------------
// 14) Realtime - استقبال الرسائل والتحديثات
// ------------------------------------------------------

function unsubscribeRealtime() {
    if (!realtimeChannel) return;

    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
}

function subscribeToActiveConversation() {
    unsubscribeRealtime();

    if (!activeConversationId) return;

    realtimeChannel = supabase
        .channel(`nivra-chat-${activeConversationId}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "direct_messages",
                filter: `conversation_id=eq.${activeConversationId}`
            },
            async (payload) => {
                // إعادة تحميل الرسائل عند وصول رسالة أو تعديلها أو حذفها
                await loadActiveMessages();

                const newMessage = payload.new;

                if (
                    payload.eventType === "INSERT" &&
                    newMessage &&
                    newMessage.sender_user_id !== myId
                ) {
                    await markMessagesAsRead();
                }

                await loadConversations();
            }
        )
        .subscribe((status) => {
            if (status === "CHANNEL_ERROR") {
                console.error("Realtime channel error.");
            }
        });
}

// ------------------------------------------------------
// 15) تعديل رسالة
// ------------------------------------------------------

function startEditingMessage(messageId) {
    const message = messages.find(item =>
        item.id === messageId
    );

    if (!message || message.sender_user_id !== myId) {
        showToast("يمكنك تعديل رسائلك فقط.", "warning");
        return;
    }

    editingMessageId = messageId;

    if (els.messageInput) {
        els.messageInput.value = message.body;
        els.messageInput.focus();
        resizeMessageInput();
        updateCharacterCounter();
    }

    setHidden(els.editingIndicator, false);

    if (els.sendButtonText) {
        els.sendButtonText.textContent = "حفظ التعديل";
    }

    closeContextMenu();
}

function cancelEditingMessage() {
    editingMessageId = null;

    if (els.messageInput) {
        els.messageInput.value = "";
        resizeMessageInput();
    }

    setHidden(els.editingIndicator, true);

    if (els.sendButtonText) {
        els.sendButtonText.textContent = "إرسال";
    }

    updateCharacterCounter();
}

async function saveEditedMessage() {
    const body = (els.messageInput?.value || "").trim();

    if (!body) {
        showToast("اكتب نص الرسالة أولاً.", "warning");
        return;
    }

    if (body.length > 5000) {
        showToast("الرسالة أطول من الحد المسموح.", "warning");
        return;
    }

    const messageId = editingMessageId;

    if (!messageId) return;

    try {
        // تتطلب RPC باسم edit_direct_message
        // مع الوسيطين p_message_id و p_body.
        const { error } = await supabase.rpc(
            "edit_direct_message",
            {
                p_message_id: messageId,
                p_body: body
            }
        );

        if (error) throw error;

        cancelEditingMessage();
        await loadActiveMessages();

        showToast("تم تعديل الرسالة.");

    } catch (error) {
        console.error("Edit message error:", error);

        showToast(
            "تعذر تعديل الرسالة. تأكد من إضافة دالة SQL الخاصة بالتعديل.",
            "error"
        );
    }
}

// ------------------------------------------------------
// 16) حذف رسالة
// ------------------------------------------------------

async function deleteMessage(messageId) {
    const message = messages.find(item =>
        item.id === messageId
    );

    if (!message || message.sender_user_id !== myId) {
        showToast("يمكنك حذف رسائلك فقط.", "warning");
        return;
    }

    try {
        // تتطلب RPC باسم delete_direct_message
        // مع الوسيط p_message_id.
        const { error } = await supabase.rpc(
            "delete_direct_message",
            {
                p_message_id: messageId
            }
        );

        if (error) throw error;

        closeContextMenu();

        await loadActiveMessages();
        await loadConversations();

        showToast("تم حذف الرسالة.");

    } catch (error) {
        console.error("Delete message error:", error);

        showToast(
            "تعذر حذف الرسالة. تأكد من إضافة دالة SQL الخاصة بالحذف.",
            "error"
        );
    }
}

// ------------------------------------------------------
// 17) قائمة خيارات الرسالة
// ------------------------------------------------------

function openMessageContextMenu(messageId, target) {
    const message = messages.find(item =>
        item.id === messageId
    );

    if (!message || !els.messageContextMenu) return;

    activeMessageId = messageId;

    const isMine = message.sender_user_id === myId;

    els.messageContextMenu
        .querySelectorAll(".own-message-action")
        .forEach(button => {
            button.hidden = !isMine;
        });

    const rect = target.getBoundingClientRect();

    els.messageContextMenu.style.position = "fixed";
    els.messageContextMenu.style.left =
        `${Math.max(8, Math.min(rect.left, window.innerWidth - 190))}px`;

    els.messageContextMenu.style.top =
        `${Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 170))}px`;

    setHidden(els.messageContextMenu, false);
}

async function copyMessage(messageId) {
    const message = messages.find(item =>
        item.id === messageId
    );

    if (!message) return;

    try {
        await navigator.clipboard.writeText(message.body);
        showToast("تم نسخ الرسالة.");
    } catch {
        showToast("تعذر نسخ الرسالة.", "error");
    }

    closeContextMenu();
}

// ------------------------------------------------------
// 18) نافذة التأكيد
// ------------------------------------------------------

function openConfirmModal({
    title = "تأكيد العملية",
    message = "هل أنت متأكد؟",
    warning = "",
    icon = "!",
    buttonText = "تأكيد",
    onConfirm
}) {
    if (els.confirmTitle) {
        els.confirmTitle.textContent = title;
    }

    if (els.confirmMessage) {
        els.confirmMessage.textContent = message;
    }

    if (els.confirmWarning) {
        els.confirmWarning.textContent = warning;
        els.confirmWarning.hidden = !warning;
    }

    if (els.confirmIcon) {
        els.confirmIcon.textContent = icon;
    }

    if (els.confirmActionBtn) {
        els.confirmActionBtn.textContent = buttonText;
    }

    confirmCallback = onConfirm;

    setHidden(els.confirmModal, false);
}

function closeConfirmModal() {
    setHidden(els.confirmModal, true);
    confirmCallback = null;
}

async function runConfirmAction() {
    if (!confirmCallback) return;

    const callback = confirmCallback;

    if (els.confirmActionBtn) {
        els.confirmActionBtn.disabled = true;
    }

    try {
        await callback();
        closeConfirmModal();

    } catch (error) {
        console.error(error);
        showToast("تعذر تنفيذ العملية.", "error");

    } finally {
        if (els.confirmActionBtn) {
            els.confirmActionBtn.disabled = false;
        }
    }
}

// ------------------------------------------------------
// 19) إخفاء المحادثة عندي فقط
// ------------------------------------------------------

function hideCurrentConversation() {
    if (!activeConversationId) return;

    openConfirmModal({
        title: "إخفاء المحادثة",
        message: "هل تريد إخفاء هذه المحادثة من قائمتك؟",
        warning:
            "لن تُحذف الرسائل من قاعدة البيانات، وستبقى المحادثة ظاهرة عند الموظف الآخر. الإخفاء محفوظ على هذا المتصفح فقط.",
        icon: "👁",
        buttonText: "إخفاء المحادثة",

        onConfirm: async () => {
            const hiddenIds = getHiddenConversations();

            if (!hiddenIds.includes(activeConversationId)) {
                hiddenIds.push(activeConversationId);
            }

            saveHiddenConversations(hiddenIds);

            unsubscribeRealtime();

            activeConversationId = null;
            activeEmployee = null;
            messages = [];

            setHidden(els.chatScreen, true);
            setHidden(els.welcomeScreen, false);

            closeDropdown();
            cancelEditingMessage();

            await loadConversations();

            showToast("تم إخفاء المحادثة من قائمتك.");
        }
    });
}

// ------------------------------------------------------
// 20) نافذة معلومات الموظف
// ------------------------------------------------------

function openEmployeeInfo() {
    if (!activeEmployee) return;

    if (els.employeeInfoTitle) {
        els.employeeInfoTitle.textContent =
            activeEmployee.name || "معلومات الموظف";
    }

    if (els.infoEmployeeName) {
        els.infoEmployeeName.textContent =
            activeEmployee.name || "—";
    }

    setAvatar(
        els.infoEmployeeAvatar,
        activeEmployee.name || "موظف"
    );

    setHidden(els.employeeInfoModal, false);
}

function closeEmployeeInfo() {
    setHidden(els.employeeInfoModal, true);
}

// ------------------------------------------------------
// 21) البحث داخل المحادثة
// ------------------------------------------------------

function openMessageSearch() {
    setHidden(els.chatSearchPanel, false);
    els.messageSearchInput?.focus();
}

function closeMessageSearch() {
    if (els.messageSearchInput) {
        els.messageSearchInput.value = "";
    }

    setHidden(els.chatSearchPanel, true);
    renderMessages();
}

// ------------------------------------------------------
// 22) عداد الأحرف وتغيير ارتفاع حقل الرسالة
// ------------------------------------------------------

function updateCharacterCounter() {
    if (!els.messageInput || !els.characterCounter) return;

    const length = els.messageInput.value.length;

    els.characterCounter.textContent = `${length}/5000`;

    els.characterCounter.classList.toggle(
        "limit-reached",
        length >= 4800
    );
}

function resizeMessageInput() {
    if (!els.messageInput) return;

    els.messageInput.style.height = "auto";

    els.messageInput.style.height =
        `${Math.min(els.messageInput.scrollHeight, 150)}px`;
}

// ------------------------------------------------------
// 23) فتح وإغلاق القائمة الجانبية
// ------------------------------------------------------

function openSidebar() {
    els.chatSidebar?.classList.add("sidebar-open");
    els.chatSidebar?.classList.remove("sidebar-closed");
}

function closeSidebar() {
    els.chatSidebar?.classList.remove("sidebar-open");
    els.chatSidebar?.classList.add("sidebar-closed");
}
function showWelcomeScreen() {
    unsubscribeRealtime();

    activeConversationId = null;
    activeEmployee = null;
    messages = [];

    setHidden(els.chatScreen, true);
    setHidden(els.welcomeScreen, false);

    closeSidebar();
    closeDropdown();
    cancelEditingMessage();

    renderEmployees();
}

// ------------------------------------------------------
// 24) التعامل مع أزرار قائمة المحادثة
// ------------------------------------------------------

function handleConversationAction(action) {
    closeDropdown();

    switch (action) {
        case "conversation-info":
            openEmployeeInfo();
            break;

        case "search":
            openMessageSearch();
            break;

        case "delete-conversation":
            // الاسم الموجود في HTML قديم؛
            // وظيفته الآن إخفاء المحادثة عند المستخدم الحالي.
            hideCurrentConversation();
            break;
    }
}

// ------------------------------------------------------
// 25) أحداث واجهة المستخدم
// ------------------------------------------------------

function bindEvents() {

    // اختيار موظف من القائمة
    els.employeesList?.addEventListener("click", event => {
        const item = event.target.closest("[data-employee-id]");
        if (!item) return;

        openConversation(item.dataset.employeeId);
    });

    // البحث عن موظف
    els.employeeSearch?.addEventListener("input", () => {
        renderEmployees();
    });

    // فلاتر الكل وغير المقروء
    document.querySelectorAll(".conversation-filters [data-filter]")
        .forEach(button => {
            button.addEventListener("click", () => {
                activeFilter = button.dataset.filter;

                document.querySelectorAll(
                    ".conversation-filters [data-filter]"
                ).forEach(item => {
                    item.classList.toggle(
                        "active",
                        item.dataset.filter === activeFilter
                    );
                });

                renderEmployees();
            });
        });

    // إرسال الرسالة
    els.messageForm?.addEventListener("submit", event => {
        event.preventDefault();

        if (editingMessageId) {
            saveEditedMessage();
        } else {
            sendMessage(event);
        }
    });

    // Enter للإرسال و Shift+Enter لسطر جديد
    els.messageInput?.addEventListener("keydown", event => {
        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.isComposing
        ) {
            event.preventDefault();

            if (editingMessageId) {
                saveEditedMessage();
            } else {
                sendMessage(event);
            }
        }
    });

    els.messageInput?.addEventListener("input", () => {
        updateCharacterCounter();
        resizeMessageInput();
    });

    // إلغاء التعديل
    els.cancelEditBtn?.addEventListener(
        "click",
        cancelEditingMessage
    );

    // أزرار القائمة الجانبية
    els.openSidebarBtn?.addEventListener("click", openSidebar);
    els.closeSidebarBtn?.addEventListener("click", closeSidebar);

    els.mobileBackBtn?.addEventListener(
        "click",
        showWelcomeScreen
    );

    // قائمة خيارات المحادثة
    els.conversationMenuBtn?.addEventListener("click", event => {
        event.stopPropagation();

        const isHidden =
            els.conversationDropdown?.hidden !== false;

        setHidden(els.conversationDropdown, !isHidden);
    });

    els.conversationDropdown?.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        handleConversationAction(button.dataset.action);
    });

    // معلومات الموظف
    els.conversationInfoBtn?.addEventListener(
        "click",
        openEmployeeInfo
    );

    els.closeEmployeeInfoBtn?.addEventListener(
        "click",
        closeEmployeeInfo
    );

    els.closeEmployeeInfoFooter?.addEventListener(
        "click",
        closeEmployeeInfo
    );

    // البحث داخل الرسائل
    els.searchMessagesBtn?.addEventListener(
        "click",
        openMessageSearch
    );

    els.closeMessageSearchBtn?.addEventListener(
        "click",
        closeMessageSearch
    );

    els.messageSearchInput?.addEventListener("input", () => {
        renderMessages();
    });

    // قائمة خيارات الرسائل
    els.messagesList?.addEventListener("click", event => {
        const menuButton = event.target.closest(
            "[data-message-menu]"
        );

        if (menuButton) {
            event.stopPropagation();

            openMessageContextMenu(
                menuButton.dataset.messageMenu,
                menuButton
            );
        }
    });

    // النقر بزر الفأرة الأيمن على الرسالة
    els.messagesList?.addEventListener("contextmenu", event => {
        const row = event.target.closest("[data-message-id]");
        if (!row) return;

        event.preventDefault();

        openMessageContextMenu(
            row.dataset.messageId,
            row
        );
    });

    // خيارات قائمة الرسالة
    els.messageContextMenu?.addEventListener("click", event => {
        const button = event.target.closest(
            "[data-message-action]"
        );

        if (!button || !activeMessageId) return;

        const action = button.dataset.messageAction;
        const messageId = activeMessageId;

        if (action === "copy") {
            copyMessage(messageId);
        }

        if (action === "edit") {
            startEditingMessage(messageId);
        }

        if (action === "delete") {
            closeContextMenu();

            openConfirmModal({
                title: "حذف الرسالة",
                message: "هل تريد حذف هذه الرسالة؟",
                warning: "لا يمكن التراجع عن حذف الرسالة.",
                icon: "🗑",
                buttonText: "حذف",

                onConfirm: async () => {
                    await deleteMessage(messageId);
                }
            });
        }
    });

    // أزرار نافذة التأكيد
    els.closeConfirmModal?.addEventListener(
        "click",
        closeConfirmModal
    );

    els.cancelConfirmBtn?.addEventListener(
        "click",
        closeConfirmModal
    );

    els.confirmActionBtn?.addEventListener(
        "click",
        runConfirmAction
    );

    // إغلاق القوائم عند النقر خارجها
    document.addEventListener("click", event => {
        if (
            !event.target.closest("#conversationDropdown") &&
            !event.target.closest("#conversationMenuBtn")
        ) {
            closeDropdown();
        }

        if (
            !event.target.closest("#messageContextMenu") &&
            !event.target.closest("[data-message-menu]")
        ) {
            closeContextMenu();
        }
    });

    // إغلاق النوافذ عند الضغط على Escape
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        closeDropdown();
        closeContextMenu();

        if (els.confirmModal && !els.confirmModal.hidden) {
            closeConfirmModal();
        }

        if (
            els.employeeInfoModal &&
            !els.employeeInfoModal.hidden
        ) {
            closeEmployeeInfo();
        }

        if (
            els.chatSearchPanel &&
            !els.chatSearchPanel.hidden
        ) {
            closeMessageSearch();
        }

        closeSidebar();
    });
}

// ------------------------------------------------------
// 26) بدء النظام
// ------------------------------------------------------

async function initMessages() {
    try {
        bindEvents();

        setHidden(els.chatScreen, true);
        setHidden(els.confirmModal, true);
        setHidden(els.employeeInfoModal, true);
        setHidden(els.conversationDropdown, true);
        setHidden(els.messageContextMenu, true);
        setHidden(els.chatSearchPanel, true);
        setHidden(els.editingIndicator, true);

        await loadMyProfile();
        await loadEmployees();
        await loadConversations();

        setHidden(els.welcomeScreen, false);

        updateCharacterCounter();

        console.log("NIVRA Messages initialized.");

    } catch (error) {
        console.error("NIVRA Messages initialization error:", error);

        showToast(
            error.message || "تعذر تشغيل نظام المراسلات.",
            "error"
        );
    }
}

initMessages();